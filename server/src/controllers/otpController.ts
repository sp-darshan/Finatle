import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { OtpService } from '../services/otpService';
import { sendSuccess } from '../utils/response';

export async function sendPasswordOtp(req: AuthenticatedRequest, res: Response) {
  const result = await OtpService.sendPasswordOtp(req.user?.userId, req.user?.email);
  return sendSuccess(res, result);
}

export async function changePasswordWithOtp(req: AuthenticatedRequest, res: Response) {
  const result = await OtpService.changePasswordWithOtp(req.user?.userId, req.body);
  return sendSuccess(res, result);
}
