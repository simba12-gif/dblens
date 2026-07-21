import { Router, Request, Response } from 'express';
import { getDb } from '../db/pool';
import { SchemaGraph } from '../types/schema';

const router = Router();

// Generate a random 8-char alphanumeric ID
function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/share — save schema, return share ID
router.post('/', async (req: Request, res: Response): Promise<any> => {
  const { graph } = req.body as { graph: SchemaGraph };

  if (!graph || !graph.tables) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid schema graph.' },
    });
  }

  // Limit schema size — max 2MB JSON
  const schemaJson = JSON.stringify(graph);
  if (schemaJson.length > 2 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: { message: 'Schema too large to share (max 2MB).' },
    });
  }

  const db = await getDb();
  const id = generateId();

  try {
    await db.run(
      `INSERT INTO shared_schemas (id, schema_json) VALUES (?, ?)`,
      [id, schemaJson]
    );
    return res.json({ success: true, data: { id, shareUrl: `/s/${id}` } });
  } catch (err) {
    console.error('[DBLens] Share save error:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to save shared schema.' },
    });
  }
});

// GET /api/share/:id — retrieve schema by ID
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  // Validate ID format — only alphanumeric, exactly 8 chars
  if (!/^[a-z0-9]{8}$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid share ID format.' },
    });
  }

  const db = await getDb();

  try {
    await db.run(
      `UPDATE shared_schemas
       SET view_count = view_count + 1
       WHERE id = ?
         AND expires_at > datetime('now')`,
      [id]
    );

    const row = await db.get(
      `SELECT schema_json, created_at, expires_at, view_count 
       FROM shared_schemas 
       WHERE id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Share link not found or has expired.',
          suggestion: 'Share links expire after 30 days. Ask the owner to generate a new link.',
        },
      });
    }

    return res.json({
      success: true,
      data: {
        graph: JSON.parse(row.schema_json),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        viewCount: row.view_count,
      },
    });
  } catch (err) {
    console.error('[DBLens] Share fetch error:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve shared schema.' },
    });
  }
});

export default router;
