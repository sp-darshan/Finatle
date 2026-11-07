import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import apiRouter from './routes';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app: Express = express();

  // Production-Hardened CORS Configuration
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
  ];

  const configuredOrigins = (ENV.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, or Postman)
        if (!origin) return callback(null, true);

        // In development, automatically permit any localhost origin
        if (ENV.NODE_ENV !== 'production') {
          if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
          }
        }

        // Match exact allowed origin
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In production, reject unauthorized domains
        return callback(new Error(`CORS Error: Origin '${origin}' is not authorized to access this API.`));
      },
      credentials: true,
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
