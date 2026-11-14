// Smart Community Intelligence Platform (SCIP) - Express Application Core
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes';
import reportRoutes from './routes/reportRoutes';
import incidentRoutes from './routes/incidentRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import adminRoutes from './routes/adminRoutes';
import miscRoutes from './routes/miscRoutes';
import locationRoutes from './routes/locationRoutes';
import iplogRoutes from './routes/iplogRoutes';
import geoanalyticsRoutes from './routes/geoanalyticsRoutes';
import mapRoutes from './routes/mapRoutes';
import imageRoutes from './routes/imageRoutes';
import databaseRoutes from './routes/databaseRoutes';
import indiaCivicRoutes from './routes/indiaCivicRoutes';
import { initMongoConnection, getMongoRuntimeStatus } from '../database/mongoConnection.js';
import { tryEnableMongoRuntime } from '../database/index.js';
import { validateJwtConfigOnStartup } from './middleware/auth.js';
import { logger } from './logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export interface CreateAppOptions {
  initMongo?: boolean;
  attachFrontend?: boolean; // static dist in production, vite middleware in development
}

export async function createApp(options: CreateAppOptions = {}) {
  // Fail closed early in production if JWT config is missing/weak.
  validateJwtConfigOnStartup();

  const app = express();

  // Trust proxy configuration for production deployments behind reverse proxies/load balancers.
  // Set SCIP_TRUST_PROXY=true only when behind a trusted proxy (e.g. Nginx, ALB).
  // When enabled, Express trusts X-Forwarded-* headers for req.ip, req.ips, etc.
  if (process.env.SCIP_TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  }

  // Initialize MongoDB connection lifecycle asynchronously if configured, then safely
  // evaluate explicit isolated runtime gates (no split-brain/default cutover).
  if (options.initMongo !== false) {
    await initMongoConnection().catch(() => {});
    try { tryEnableMongoRuntime(getMongoRuntimeStatus() as any); } catch { /* keep JSON fallback */ }
  }

  // Security headers and restrictive defaults
  app.disable('x-powered-by');
  const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
    }
    const origin = req.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

// Distributed-capable rate limiting (in-memory default; shared store opt-in for multi-instance)
  const { createRateLimitStore, getRateLimitKey } = await import('./rateLimit.js');
  const rateLimiter = createRateLimitStore();
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use(async (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }
    const now = Date.now();
    const windowMs = 60_000;
    const isAuth = req.path.startsWith('/api/auth');
    const limit = isAuth ? 60 : 300;
    const key = getRateLimitKey(req);
    let count: number;
    try {
      count = await rateLimiter.increment(key, windowMs);
    } catch {
      // Fallback to in-memory on store error
      if (rateBuckets.size > 5000) {
        for (const [k, v] of rateBuckets) { if (now > v.resetAt) rateBuckets.delete(k); }
      }
      const existing = rateBuckets.get(key);
      if (!existing || now > existing.resetAt) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        count = 1;
      } else {
        existing.count += 1;
        count = existing.count;
      }
    }
    if (count > limit) {
      res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/iplogs', iplogRoutes);
  app.use('/api/geoanalytics', geoanalyticsRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/image', imageRoutes);
app.use('/api/india', indiaCivicRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api', miscRoutes);

  // API 404 and safe error handling (before SPA fallback)
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found.' });
  });
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : (err?.message || 'Internal server error.');
    if (!res.headersSent) {
      res.status(status).json({ success: false, message });
    }
  });

  const attachFrontend = options.attachFrontend !== false && process.env.NODE_ENV !== 'test';
  if (attachFrontend) {
    // Development: Vite Middleware Mode; Production: Static dist
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(rootDir, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          res.status(404).json({ success: false, message: 'Not found.' });
          return;
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      try {
        const vite = await createViteServer({
          server: {
            middlewareMode: true,
            hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
            watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
          },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (viteErr) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[SCIP] Vite middleware init warning.');
        } else {
          console.error('[SCIP] Vite middleware init warning:', viteErr);
        }
      }
    }
  }

  return app;
}

export async function startServer() {
  const app = await createApp();
  const { closeMongoConnection } = await import('../database/mongoConnection.js');

  // Dev server must run on port 3000. Respect --port arg, else fallback to 3000.
  let PORT = 3000;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) PORT = parsed;
  } else if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    if (process.env.NODE_ENV === 'production') {
      logger.info(`[SCIP] Server running on port ${PORT}`);
    } else {
      logger.info(`[SCIP] Smart Community Intelligence Platform server running on http://0.0.0.0:${PORT}`);
    }
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[SCIP] Received ${signal}. Shutting down gracefully...`);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      // Force-resolve in case server.close hangs (e.g. keep-alive); do not exit process here except via caller context.
      setTimeout(() => resolve(), 5000).unref?.();
    });
    await closeMongoConnection().catch(() => {});
  };

  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

  return { app, server };
}
