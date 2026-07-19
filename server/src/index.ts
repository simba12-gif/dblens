import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import schemaRouter from './routes/schema';
import dbRouter from './routes/db';
import aiRouter from './routes/ai';
// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// --- CORS ----------------------------------------------------------------
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// --- Body parsers --------------------------------------------------------
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Schema routes
app.use('/api/schema', schemaRouter);
app.use('/api/db', dbRouter);
app.use('/api/ai', aiRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[DBLens] Unhandled error:', err);

  const statusCode = (err as any).statusCode ?? 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    },
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║        ____  ____  _                     ║
║       |  _ \\| __ )| |    ___ _ __  ___   ║
║       | | | |  _ \\| |   / _ \\ '_ \\/ __|  ║
║       | |_| | |_) | |__|  __/ | | \\__ \\  ║
║       |____/|____/|_____\\___|_| |_|___/  ║
║                                          ║
║          Database Schema Visualizer      ║
║                                          ║
╠══════════════════════════════════════════╣
║  Server running on port ${String(PORT).padEnd(5)}            ║
║  Health: http://localhost:${PORT}/api/health  ║
╚══════════════════════════════════════════╝
  `);
});

export default app;
