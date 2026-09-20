import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export async function getDb(): Promise<Pool> {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return poolInstance;
}