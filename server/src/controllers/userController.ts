import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { UserService } from '../services/userService';
import { sendSuccess } from '../utils/response';

export async function getMe(req: AuthenticatedRequest, res: Response) {
  const result = await UserService.getUserProfile(req.user?.userId);
  return sendSuccess(res, result);
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const result = await UserService.updateUserProfile(req.user?.userId, req.body);
  return sendSuccess(res, result);
}

export async function deleteMe(req: AuthenticatedRequest, res: Response) {
  const result = await UserService.deleteUserAccount(req.user?.userId);
  return sendSuccess(res, result);
}
