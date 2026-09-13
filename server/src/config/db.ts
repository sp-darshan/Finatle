import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { ENV } from './env';

// Direct PostgreSQL Connection Pool via 'pg'
export const pgPool = new Pool({
  connectionString: ENV.DIRECT_URL || ENV.DATABASE_URL,
});

// Prisma Client ORM Instance
export const prisma = new PrismaClient();

export interface DbConnectionStatus {
  connected: boolean;
  message: string;
  details?: any;
}

// Helper to verify Database Connectivity
export async function checkDatabaseConnection(): Promise<DbConnectionStatus> {
  try {
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
