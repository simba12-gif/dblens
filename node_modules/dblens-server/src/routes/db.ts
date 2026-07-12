import { Router, Request, Response } from 'express';
import { introspectDatabase } from '../db/introspector';
import { ParseError } from '../types/schema';

const router = Router();

router.post('/connect', async (req: Request, res: Response): Promise<any> => {
  const { connectionString } = req.body;

  if (!connectionString || typeof connectionString !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'No connection string provided.',
        suggestion: 'Send { "connectionString": "postgresql://user:pass@host:port/db" } in the request body.',
      } satisfies ParseError,
    });
  }

  try {
    const graph = await introspectDatabase(connectionString);
    return res.json({ success: true, data: graph });
  } catch (err) {
    if (isParseError(err)) {
      return res.status(400).json({ success: false, error: err });
    }
    const message = err instanceof Error ? err.message : 'Failed to introspect database.';
    return res.status(500).json({
      success: false,
      error: {
        message,
        suggestion: 'Ensure the database is running and the connection string is correct.',
      } satisfies ParseError,
    });
  }
});

function isParseError(err: unknown): err is ParseError {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as ParseError).message === 'string';
}

export default router;
