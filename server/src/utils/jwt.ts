import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthTokenPayload } from '../types/common.types';

export { AuthTokenPayload };

/**
 * Signs a JWT token with user payload.
 */
export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies and decodes a JWT token.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}
