import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Direct PostgreSQL Connection Pool via 'pg'
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Client ORM Instance
export const prisma = new PrismaClient();

// Helper to verify Database Connectivity
export async function checkDatabaseConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
  try {
    // Attempt a lightweight query via pg pool
    const result = await pgPool.query('SELECT NOW() as current_time, current_database() as db_name');
    return {
      connected: true,
      message: 'Successfully connected to PostgreSQL database.',
      details: {
        currentTime: result.rows[0].current_time,
        database: result.rows[0].db_name,
      },
    };
  } catch (error: any) {
    return {
      connected: false,
      message: `PostgreSQL connection pending/failed: ${error.message || error}`,
      details: error,
    };
  }
}
