import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { SignUpDto, SignInDto } from '../types/auth.types';
import { BadRequestError, ConflictError, UnauthorizedError } from '../errors/AppError';
import { parseOptionalAge, sanitizeString } from '../utils/parsers';

// In-memory fallback users for dev / unmigrated database state
export const inMemoryUsers: any[] = [];

export class AuthService {
  /**
   * Register / Sign Up a new user with age, name, email, and salted password hash
   */
  static async signUp(dto: SignUpDto) {
    const { email, password, name, age } = dto;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required fields.');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long.');
    }

    const parsedAge = parseOptionalAge(age);
    if (parsedAge === -1) {
      throw new BadRequestError('Age must be a valid positive integer.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await hashPassword(password);
    const sanitizedName = sanitizeString(name);

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
          age: parsedAge,
          account: {
            create: {
              balance: 0,
            },
          },
        },
        include: { account: true },
      });

      const token = generateToken({ userId: newUser.uid, email: newUser.email });

      return {
        message: 'User registered successfully in PostgreSQL database.',
        token,
        user: {
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          age: newUser.age,
          account: newUser.account,
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
        age: parsedAge,
        createdAt: new Date().toISOString(),
        account: { balance: 0 },
      };
      inMemoryUsers.push(fallbackUser);

      const token = generateToken({ userId: fallbackUser.uid, email: fallbackUser.email });

      return {
        message: 'User registered successfully (in-memory fallback mode). Connect Supabase/PostgreSQL to persist permanently.',
        token,
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          age: fallbackUser.age,
          account: fallbackUser.account,
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

      const token = generateToken({ userId: user.uid, email: user.email });

      return {
        message: 'Signed in successfully.',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
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
        throw new UnauthorizedError('Invalid email or password (in-memory).');
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const token = generateToken({ userId: user.uid, email: user.email });

      return {
        message: 'Signed in successfully (in-memory mode).',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          age: user.age,
          createdAt: user.createdAt,
        },
      };
    }
  }
}
