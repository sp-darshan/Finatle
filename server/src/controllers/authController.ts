import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { sendCreated, sendSuccess } from '../utils/response';

// Re-export profile, OTP, and account handlers from their normalized controller modules
export { getMe, updateProfile, deleteMe } from './userController';
export { sendPasswordOtp, changePasswordWithOtp } from './otpController';

/**
 * Register / Sign Up a new user with age, name, email, and salted password hash
 */
export async function signUp(req: Request, res: Response) {
  const result = await AuthService.signUp(req.body);
  return sendCreated(res, result);
}

/**
 * Sign In / Login user with email and password
 */
export async function signIn(req: Request, res: Response) {
  const result = await AuthService.signIn(req.body);
  return sendSuccess(res, result);
}
