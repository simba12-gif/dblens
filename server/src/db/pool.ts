import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await open({
      filename: path.join(__dirname, '../../../database.sqlite'),
      driver: sqlite3.Database
    });
  }
  return dbInstance;
}
