import 'dotenv/config';
import { getDb } from './pool';

async function migrate() {
  const db = await getDb();
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shared_schemas (
      id          TEXT PRIMARY KEY,
      schema_json TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at  DATETIME DEFAULT (datetime('now', '+30 days')),
      view_count  INTEGER  DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_shared_schemas_expires
      ON shared_schemas (expires_at);
  `);
  
  console.log('Migration complete: shared_schemas table ready (SQLite)');
}

migrate().catch(console.error);
