import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types/common.types';
import { SessionService } from '../services/sessionService';

export { AuthenticatedRequest };

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied. No valid bearer token provided in Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.',
    });
  }

  // Multi-Device Session Invalidation Check:
  // If the user reset their password on another device, activeVersion was incremented.
  // Any token issued before that reset will have tokenVersion < activeVersion and will be rejected.
  try {
    const activeVersion = await SessionService.getUserTokenVersion(decoded.userId);
    const tokenVersion = decoded.tokenVersion ?? 0;

    if (tokenVersion < activeVersion) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'SESSION_REVOKED',
        message: 'Your session has expired because your password was changed from another device. Please log in again.',
      });
    }
  } catch (err) {
    console.warn('[AuthMiddleware] Non-blocking session check notice:', err);
  }

  req.user = decoded;
  next();
}
