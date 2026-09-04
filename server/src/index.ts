import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { checkDatabaseConnection } from './db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev setup
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', apiRouter);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    app: 'Finatle API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      items: '/api/items',
    },
  });
});

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err.stack);
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
  
  const dbConnection = await checkDatabaseConnection();
  if (dbConnection.connected) {
    console.log(`🟢 PostgreSQL Status: Connected (${dbConnection.details?.database})`);
  } else {
    console.log(`🟡 PostgreSQL Status: Pending configuration`);
    console.log(`💡 ${dbConnection.message}`);
  }
  console.log(`==================================================\n`);
});
