import { Router } from 'express';
import {
  signUp,
  signIn,
  getMe,
  deleteMe,
  updateProfile,
  sendPasswordOtp,
  changePasswordWithOtp,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public Auth Endpoints
router.post('/signup', signUp);
router.post('/login', signIn);

// Protected Auth Endpoints
router.get('/me', authMiddleware as any, getMe);
router.put('/profile', authMiddleware as any, updateProfile);
router.post('/send-otp', authMiddleware as any, sendPasswordOtp);
router.post('/change-password', authMiddleware as any, changePasswordWithOtp);
router.delete('/me', authMiddleware as any, deleteMe);

export default router;
