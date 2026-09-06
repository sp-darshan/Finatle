import { Router } from 'express';
import { signUp, signIn, getMe, deleteMe } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public Auth Endpoints
router.post('/signup', signUp);
router.post('/login', signIn);

// Protected Auth Endpoints
router.get('/me', authMiddleware as any, getMe);
router.delete('/me', authMiddleware as any, deleteMe);

export default router;
