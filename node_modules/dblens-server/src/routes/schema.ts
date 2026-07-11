import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseSql } from '../parsers/sqlParser';
import { parseJsonSchema } from '../parsers/jsonParser';
import { ParseError, SchemaGraph } from '../types/schema';

import { generateInsights } from '../analyzers/insights';

// ---------------------------------------------------------------------------
// Multer config – memory storage, 5 MB limit
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.sql', '.ddl', '.json'];
    const ext = getExtension(file.originalname);
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type "${ext}". Accepted: ${allowed.join(', ')}`,
        ),
      );
    }
  },
});

function getExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf('.');
  return dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : '';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * POST /parse
 *
 * Accepts either:
 *   1. Multipart file upload (field name: "schema") — .sql, .ddl, .json
 *   2. JSON body: { content: string, type: "sql" | "json" }
 */
router.post(
  '/parse',
  (req: Request, res: Response, next) => {
    // Try multer first; if the request isn't multipart it will still call next
    upload.single('schema')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              message: 'File exceeds the 5 MB size limit.',
              suggestion: 'Upload a smaller file or paste the content directly.',
            } satisfies ParseError,
          });
        }
        return res.status(400).json({
          success: false,
          error: { message: err.message } satisfies ParseError,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          error: { message: err.message } satisfies ParseError,
        });
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    try {
      let content: string;
      let inputType: 'sql' | 'json';

      // --- Determine content & type -------------------------------------
      if (req.file) {
        // Multipart upload path
        content = req.file.buffer.toString('utf-8');
        const ext = getExtension(req.file.originalname);
        inputType = ext === '.json' ? 'json' : 'sql';
      } else if (req.body && typeof req.body.content === 'string') {
        // JSON body path
        content = req.body.content;
        const bodyType = (req.body.type ?? '').toString().toLowerCase();

        if (bodyType !== 'sql' && bodyType !== 'json') {
          return res.status(400).json({
            success: false,
            error: {
              message: `Invalid type "${req.body.type}". Must be "sql" or "json".`,
              suggestion: 'Set the "type" field to either "sql" or "json".',
            } satisfies ParseError,
          });
        }
        inputType = bodyType as 'sql' | 'json';
      } else {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No input provided.',
            suggestion:
              'Upload a .sql/.ddl/.json file as multipart (field: "schema"), ' +
              'or send JSON body: { "content": "...", "type": "sql" | "json" }.',
          } satisfies ParseError,
        });
      }

      // --- Parse --------------------------------------------------------
      let graph: SchemaGraph;

      if (inputType === 'json') {
        graph = parseJsonSchema(content);
      } else {
        graph = parseSql(content);
      }

      return res.json({ success: true, data: graph });
    } catch (err) {
      // ParseError objects thrown by parsers
      if (isParseError(err)) {
        return res.status(400).json({ success: false, error: err });
      }

      // Unexpected errors
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      return res.status(400).json({
        success: false,
        error: {
          message,
          suggestion: 'Check your input and try again.',
        } satisfies ParseError,
      });
    }
  },
);

/**
 * POST /insights
 *
 * Accepts a parsed SchemaGraph and returns an InsightsReport.
 */
router.post('/insights', (req: Request, res: Response) => {
  try {
    const graph = req.body as SchemaGraph;
    if (!graph || !Array.isArray(graph.tables) || !Array.isArray(graph.edges)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid SchemaGraph provided.',
          suggestion: 'Ensure the request body contains a valid SchemaGraph object.',
        } satisfies ParseError,
      });
    }

    const insights = generateInsights(graph);
    return res.json({ success: true, data: insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during insights generation.';
    return res.status(400).json({
      success: false,
      error: {
        message,
        suggestion: 'Check the structure of the provided SchemaGraph.',
      } satisfies ParseError,
    });
  }
});

function isParseError(err: unknown): err is ParseError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as ParseError).message === 'string'
  );
}

export default router;
