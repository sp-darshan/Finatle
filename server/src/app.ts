import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import apiRouter from './routes';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app: Express = express();

  // Basic Middlewares
  app.use(
    cors({
      origin: ENV.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request Logger
  app.use(requestLogger);

  // Root Index Endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      app: 'Finatle API Server (Supabase/PostgreSQL ready)',
      version: '1.2.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: {
          signup: 'POST /api/auth/signup',
          login: 'POST /api/auth/login',
          me: 'GET /api/auth/me',
          profile: 'PUT /api/auth/profile',
          sendOtp: 'POST /api/auth/send-otp',
          changePassword: 'POST /api/auth/change-password',
          deleteMe: 'DELETE /api/auth/me',
        },
        finance: {
          account: 'GET /api/finance/account',
          summary: 'GET /api/finance/summary',
          createTransaction: 'POST /api/finance/transactions',
          createMoneyLent: 'POST /api/finance/lent',
          createMoneyBorrowed: 'POST /api/finance/borrowed',
        },
      },
    });
  });

  // Mount Central API Routes (/api/...)
  app.use('/api', apiRouter);

  // Global Error Handler Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
