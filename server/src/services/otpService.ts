import { prisma } from '../config/db';
import { hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { inMemoryUsers } from './authService';
import { SessionService } from './sessionService';
import { ChangePasswordWithOtpDto, OtpRecord } from '../types/auth.types';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../errors/AppError';
import { EmailService } from './emailService';

// In-memory OTP storage for password change, sign up verification, and forgot password
const otpStorage = new Map<string, OtpRecord>();

export class OtpService {
  /**
   * Send 6-digit verification code to email for public flows (SIGNUP or FORGOT_PASSWORD)
   */
  static async sendPublicOtp(email: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD') {
    if (!email || !email.trim()) {
      throw new BadRequestError('Email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new BadRequestError('Please enter a valid email address (e.g. name@example.com).');
    }

    // If Forgot Password, verify user exists first
    if (purpose === 'FORGOT_PASSWORD') {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const fallbackUser = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (!user && !fallbackUser) {
        throw new NotFoundError('No Finatle account found with this email address.');
      }
    }

    // If Sign Up, ensure email is not already registered
    if (purpose === 'SIGNUP') {
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const fallbackUser = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (existingUser || fallbackUser) {
        throw new BadRequestError('An account with this email address already exists. Please Sign In instead.');
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const storageKey = `${normalizedEmail}:${purpose}`;
    otpStorage.set(storageKey, {
      otp,
      email: normalizedEmail,
      purpose,
      expiresAt,
    });

    // Dispatch email asynchronously in background so frontend UI responds in <100ms
    EmailService.sendOtpEmail(normalizedEmail, otp, purpose).catch((err) => {
      console.error('[EmailService] Async delivery error for', normalizedEmail, err);
    });

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInMinutes: 10,
    };
  }

  /**
   * Verify an OTP for public flows (without consuming it or consuming it on finalize)
   */
  static verifyPublicOtp(email: string, otp: string | number, purpose: 'SIGNUP' | 'FORGOT_PASSWORD', consume = true): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    const storageKey = `${normalizedEmail}:${purpose}`;
    const record = otpStorage.get(storageKey);

    if (!record) {
      throw new BadRequestError('No OTP request found for this email. Please request a new verification code.');
    }

    if (Date.now() > record.expiresAt) {
      otpStorage.delete(storageKey);
      throw new BadRequestError('The verification code has expired. Please request a new one.');
    }

    if (record.otp.trim() !== String(otp).trim()) {
      throw new BadRequestError('The 6-digit verification code you entered is incorrect.');
    }

    if (consume) {
      otpStorage.delete(storageKey);
    }

    return true;
  }

  /**
   * Generate and store 6-digit numeric OTP for user password change (Authenticated Settings)
   */
  static async sendPasswordOtp(userId?: string, userEmail?: string) {
    if (!userId || !userEmail) {
      throw new UnauthorizedError('Authentication required to send OTP.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStorage.set(userId, {
      otp,
      email: userEmail,
      purpose: 'SETTINGS',
      expiresAt,
    });

    // Dispatch email asynchronously in background so frontend UI responds in <100ms
    EmailService.sendOtpEmail(userEmail, otp, 'FORGOT_PASSWORD').catch((err) => {
      console.error('[EmailService] Async delivery error for', userEmail, err);
    });

    return {
      success: true,
      message: `A 6-digit OTP verification code has been sent to ${userEmail}.`,
      email: userEmail,
      expiresInMinutes: 10,
    };
  }

  /**
   * Verify email OTP and update password (Authenticated Settings)
   */
  static async changePasswordWithOtp(userId: string | undefined, dto: ChangePasswordWithOtpDto) {
    if (!userId) {
      throw new UnauthorizedError('Authentication required.');
    }

    const { otp, newPassword } = dto;

    if (!otp || !newPassword) {
      throw new BadRequestError('Both the 6-digit OTP code and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long.');
    }

    const record = otpStorage.get(userId);
    if (!record) {
      throw new BadRequestError('No OTP request found. Please request a new verification OTP code.', 'Invalid Request');
    }

    if (Date.now() > record.expiresAt) {
      otpStorage.delete(userId);
      throw new BadRequestError('The OTP verification code has expired. Please request a new code.', 'Expired OTP');
    }

    if (record.otp.trim() !== String(otp).trim()) {
      throw new BadRequestError('The 6-digit verification code you entered is incorrect.', 'Invalid OTP');
    }

    const hashedPassword = await hashPassword(newPassword);

    try {
      await prisma.user.update({
        where: { uid: userId },
        data: { password: hashedPassword },
      });
    } catch (dbError) {
      const fallbackUser = inMemoryUsers.find((u) => u.uid === userId);
      if (fallbackUser) {
        fallbackUser.password = hashedPassword;
      }
    }

    // Invalidate OTP after successful change
    const userEmail = record.email;
    otpStorage.delete(userId);

    // Invalidate all other sessions across all devices
    const newVersion = await SessionService.revokeAllOtherSessions(userId);

    // Issue fresh token specifically for the device that performed the change
    const newToken = generateToken({
      userId,
      email: userEmail,
      tokenVersion: newVersion,
    });

    return {
      success: true,
      message: 'Password has been changed and secured successfully. All other devices have been logged out.',
      token: newToken,
    };
  }
}
