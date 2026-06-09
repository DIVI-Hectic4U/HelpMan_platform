import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { userRoutes } from './routes/users';
import { taskRoutes } from './routes/tasks';
import { gamificationRoutes } from './routes/gamification';
import { telegramRoutes } from './routes/telegram';
import { pushRoutes } from './routes/push';
import { adminRoutes } from './routes/admin';
import { cronRoutes } from './routes/cron';

// Load .env — in production (Koyeb), env vars are injected directly
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://helpman-platform.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Be permissive for now; tighten later
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron', cronRoutes);

// ── Error Handler ────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🚀 HelpMan API Server                      ║
  ║  Running on: http://localhost:${PORT}          ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
