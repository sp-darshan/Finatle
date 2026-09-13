import { Router } from 'express';
import { signUp, signIn } from '../controllers/authController';
import { getMe, updateProfile, deleteMe } from '../controllers/userController';
import { sendPasswordOtp, changePasswordWithOtp } from '../controllers/otpController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public Auth Endpoints
router.post('/signup', asyncHandler(signUp));
router.post('/login', asyncHandler(signIn));

// Protected Auth & User Profile Endpoints
router.get('/me', authMiddleware as any, asyncHandler(getMe));
router.put('/profile', authMiddleware as any, asyncHandler(updateProfile));
router.post('/send-otp', authMiddleware as any, asyncHandler(sendPasswordOtp));
router.post('/change-password', authMiddleware as any, asyncHandler(changePasswordWithOtp));
router.delete('/me', authMiddleware as any, asyncHandler(deleteMe));

export default router;
