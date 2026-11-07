import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { OtpService } from '../services/otpService';
import { sendCreated, sendSuccess } from '../utils/response';

// Re-export profile, OTP, and account handlers from their normalized controller modules
export { getMe, updateProfile, deleteMe } from './userController';
export { sendPasswordOtp, changePasswordWithOtp } from './otpController';

/**
 * Register / Sign Up a new user with mandatory phone, email OTP verification, age, name, and password
 */
export async function signUp(req: Request, res: Response) {
  const result = await AuthService.signUp(req.body);
  return sendCreated(res, result);
}

/**
 * Send OTP verification code to email before completing Sign Up
 */
export async function sendSignUpOtp(req: Request, res: Response) {
  const result = await OtpService.sendPublicOtp(req.body.email, 'SIGNUP');
  return sendSuccess(res, result);
}

/**
 * Sign In / Login user with email and password
 */
export async function signIn(req: Request, res: Response) {
  const result = await AuthService.signIn(req.body);
  return sendSuccess(res, result);
}

/**
 * Send OTP verification code to user's email for password recovery
 */
export async function sendForgotPasswordOtp(req: Request, res: Response) {
  const result = await OtpService.sendPublicOtp(req.body.email, 'FORGOT_PASSWORD');
  return sendSuccess(res, result);
}

/**
 * Reset password using verified 6-digit OTP code
 */
export async function resetForgotPassword(req: Request, res: Response) {
  const result = await AuthService.forgotPasswordReset(req.body);
  return sendSuccess(res, result);
}
