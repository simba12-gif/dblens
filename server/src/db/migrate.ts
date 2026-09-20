import { getDb } from './pool';

export async function migrate(): Promise<void> {
  const db = await getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS shared_schemas (
      id VARCHAR(8) PRIMARY KEY,
      schema_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
      view_count INTEGER DEFAULT 0
    )
  `);

  console.log('[DBLens] Database migration completed.');
}