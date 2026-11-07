import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { SignUpDto, SignInDto, ForgotPasswordDto } from '../types/auth.types';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError } from '../errors/AppError';
import { parseOptionalAge, sanitizeString } from '../utils/parsers';
import { OtpService } from './otpService';
import { SessionService } from './sessionService';

// In-memory fallback users for dev / unmigrated database state
export const inMemoryUsers: any[] = [];

export class AuthService {
  /**
   * Register / Sign Up a new user with mandatory phone, email OTP verification, age, name, and password
   */
  static async signUp(dto: SignUpDto) {
    const { email, password, name, phone, age, otp } = dto;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required fields.');
    }

    // Strict email format validation
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new BadRequestError('Please enter a valid email address (e.g. name@example.com).');
    }

    // Mandatory Full Name check
    if (!name || !name.trim()) {
      throw new BadRequestError('Full name is a required field.');
    }
    const sanitizedName = name.trim();

    // Mandatory mobile number check
    if (!phone || !phone.trim()) {
      throw new BadRequestError('Mobile number is a mandatory field.');
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      throw new BadRequestError('Please enter a valid 10-digit mobile number.');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long.');
    }

    // Email verification check
    if (!otp) {
      throw new BadRequestError('Email verification code (OTP) is required to complete registration.');
    }
    OtpService.verifyPublicOtp(normalizedEmail, otp, 'SIGNUP', true);

    const parsedAge = parseOptionalAge(age);
    if (parsedAge === -1) {
      throw new BadRequestError('Age must be a valid positive integer.');
    }

    const hashedPassword = await hashPassword(password);

    try {
      // Check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictError('A user with this email address already exists.');
      }

      // Create new user in PostgreSQL / Supabase
      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: sanitizedName,
          phone: cleanedPhone,
          age: parsedAge,
          accounts: {
            create: {
              name: 'Cash',
              type: 'CASH',
              balance: 0,
              initialBalance: 0,
              color: '#10b981',
              isDefault: true,
            },
          },
        },
        include: { accounts: true },
      });

      const token = generateToken({
        userId: newUser.uid,
        email: newUser.email,
        tokenVersion: (newUser as any).tokenVersion ?? 0,
      });

      return {
        message: 'User registered successfully in database.',
        token,
        user: {
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone ?? cleanedPhone,
          age: newUser.age,
          accounts: newUser.accounts,
          createdAt: newUser.createdAt,
        },
      };
    } catch (dbError: any) {
      if (dbError instanceof ConflictError || dbError instanceof BadRequestError) {
        throw dbError;
      }

      console.error('[Auth] Database sign-up query failed, using in-memory fallback:', dbError?.message || dbError);
      
      const existingFallback = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (existingFallback) {
        throw new ConflictError('A user with this email address already exists (in-memory).');
      }

      const fallbackUser = {
        uid: `mock-${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        phone: cleanedPhone,
        age: parsedAge,
        createdAt: new Date().toISOString(),
        accounts: [
          {
            aid: 'mock-acc-1',
            name: 'Cash',
            type: 'CASH',
            balance: 0,
            initialBalance: 0,
            color: '#10b981',
            isDefault: true,
          },
        ],
      };
      inMemoryUsers.push(fallbackUser);

      const token = generateToken({
        userId: fallbackUser.uid,
        email: fallbackUser.email,
        tokenVersion: (fallbackUser as any).tokenVersion ?? 0,
      });

      return {
        message: 'User registered successfully.',
        token,
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          phone: fallbackUser.phone ?? cleanedPhone,
          age: fallbackUser.age,
          accounts: fallbackUser.accounts,
          createdAt: fallbackUser.createdAt,
        },
      };
    }
  }

  /**
   * Sign In / Login user with email and password
   */
  static async signIn(dto: SignInDto) {
    const { email, password } = dto;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Attempt DB lookup
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      // Verify bcrypt hash with stored salt
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const tokenVersion = (user as any).tokenVersion ?? (await SessionService.getUserTokenVersion(user.uid));
      const token = generateToken({
        userId: user.uid,
        email: user.email,
        tokenVersion,
      });

      return {
        message: 'Signed in successfully.',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          phone: user.phone ?? null,
          age: user.age,
          createdAt: user.createdAt,
        },
      };
    } catch (dbError: any) {
      if (dbError instanceof UnauthorizedError || dbError instanceof BadRequestError) {
        throw dbError;
      }

      console.error('[Auth] Database sign-in query failed, using in-memory fallback:', dbError?.message || dbError);
      
      const user = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const tokenVersion = (user as any).tokenVersion ?? (await SessionService.getUserTokenVersion(user.uid));
      const token = generateToken({
        userId: user.uid,
        email: user.email,
        tokenVersion,
      });

      return {
        message: 'Signed in successfully.',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          phone: user.phone ?? null,
          age: user.age,
          createdAt: user.createdAt,
        },
      };
    }
  }

  /**
   * Reset forgotten password using verified email OTP
   */
  static async forgotPasswordReset(dto: ForgotPasswordDto) {
    const { email, otp, newPassword } = dto;

    if (!email || !otp || !newPassword) {
      throw new BadRequestError('Email, verification code (OTP), and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Verify & consume OTP
    OtpService.verifyPublicOtp(normalizedEmail, otp, 'FORGOT_PASSWORD', true);

    const hashedPassword = await hashPassword(newPassword);

    let updatedUser: any = null;
    try {
      updatedUser = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { password: hashedPassword },
      });
    } catch (err) {
      const fallback = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (fallback) {
        fallback.password = hashedPassword;
        updatedUser = fallback;
      } else {
        throw new NotFoundError('User account not found.');
      }
    }

    // Invalidate all other sessions across all devices
    const newVersion = await SessionService.revokeAllOtherSessions(updatedUser.uid);

    // Issue fresh token specifically for the device that performed the reset
    const token = generateToken({
      userId: updatedUser.uid,
      email: updatedUser.email,
      tokenVersion: newVersion,
    });

    return {
      message: 'Password reset successfully. All other devices have been logged out for security.',
      token,
      user: {
        uid: updatedUser.uid,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone ?? null,
        age: updatedUser.age,
        createdAt: updatedUser.createdAt,
      },
    };
  }
}
