import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { checkDatabaseConnection } from './db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL;

// Middleware
app.use(
  cors({
    origin: clientUrl || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Central API Routes (/api/...)
app.use('/api', apiRouter);

// Root Index Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    app: 'Finatle API Server (Supabase/PostgreSQL ready)',
    version: '1.1.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        deleteMe: 'DELETE /api/auth/me',
      },
      finance: {
        account: 'GET /api/finance/account',
        summary: 'GET /api/finance/summary',
        createTransaction: 'POST /api/finance/transactions',
        createMoneyLent: 'POST /api/finance/money-lent',
        createMoneyBorrowed: 'POST /api/finance/money-borrowed',
      },
    },
  });
});

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Express Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth Endpoints: /api/auth/signup & /api/auth/login`);

  const dbConnection = await checkDatabaseConnection();
  if (dbConnection.connected) {
    console.log(`🟢 PostgreSQL / Supabase: Connected (${dbConnection.details?.database})`);
  } else {
    console.log(`🟡 PostgreSQL / Supabase: Pending configuration`);
    console.log(`💡 ${dbConnection.message}`);
  }
  console.log(`==================================================\n`);
});
