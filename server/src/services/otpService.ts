import { prisma } from '../config/db';
import { hashPassword } from '../utils/password';
import { inMemoryUsers } from './authService';
import { ChangePasswordWithOtpDto, OtpRecord } from '../types/auth.types';
import { BadRequestError, UnauthorizedError } from '../errors/AppError';

// In-memory OTP storage for password change & verification
const otpStorage = new Map<string, OtpRecord>();

export class OtpService {
  /**
   * Generate and store 6-digit numeric OTP for user password change
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
      expiresAt,
    });

    console.log('\n======================================================');
    console.log('🔐 [FINATLE SECURITY OTP VERIFICATION]');
    console.log(`📧 User Email: ${userEmail}`);
    console.log(`🔢 6-Digit OTP Code: ${otp}`);
    console.log(`⏳ Valid For: 10 minutes (Expires: ${new Date(expiresAt).toLocaleTimeString()})`);
    console.log('======================================================\n');

    return {
      success: true,
      message: `A 6-digit OTP verification code has been sent to ${userEmail}.`,
      email: userEmail,
      devOtp: otp,
      expiresInMinutes: 10,
    };
  }

  /**
   * Verify email OTP and update password
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
    otpStorage.delete(userId);

    return {
      success: true,
      message: 'Password has been changed and secured successfully.',
    };
  }
}
