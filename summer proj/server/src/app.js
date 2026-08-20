import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { sanitize } from './middleware/sanitize.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/public/auth.routes.js';
import usersRoutes from './routes/public/users.routes.js';
import filesRoutes from './routes/public/files.routes.js';
import verificationRoutes from './routes/public/verification.routes.js';
import eventsRoutes from './routes/public/events.routes.js';
import proposalsRoutes from './routes/public/proposals.routes.js';
import messagesRoutes from './routes/public/messages.routes.js';
import notificationsRoutes from './routes/public/notifications.routes.js';
import reviewsRoutes from './routes/public/reviews.routes.js';
import walletRoutes from './routes/public/wallet.routes.js';
import reportsRoutes from './routes/public/reports.routes.js';

import adminAuthRoutes from './routes/admin/adminAuth.routes.js';
import adminVerificationRoutes from './routes/admin/verification.routes.js';
import adminUserRoutes from './routes/admin/userManagement.routes.js';
import adminWalletRoutes from './routes/admin/walletManagement.routes.js';
import adminReportsRoutes from './routes/admin/reports.routes.js';
import adminPanelRoutes from './routes/admin/adminPanel.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
  }));

  app.use(cors({
    origin(origin, cb) {
      if (env.NODE_ENV !== 'production') return cb(null, true);
      const allowed = [...env.CLIENT_ORIGIN, ...env.ADMIN_CLIENT_ORIGIN];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      const normalized = origin.replace(/^http:\/\/(localhost|127\.0\.0\.1):/, 'http://localhost:');
      if (allowed.some((a) => a === normalized)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(sanitize);

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nDisallow: /${env.ADMIN_ROUTE_PATH}\nDisallow: /api/${env.ADMIN_ROUTE_PATH}\n`);
  });

  app.use('/api', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use(filesRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/proposals', proposalsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/reports', reportsRoutes);

  app.use(`/api/${env.ADMIN_ROUTE_PATH}/auth`, adminAuthRoutes);
  app.use(`/api/${env.ADMIN_ROUTE_PATH}/verification`, adminVerificationRoutes);
  app.use(`/api/${env.ADMIN_ROUTE_PATH}/users`, adminUserRoutes);
  app.use(`/api/${env.ADMIN_ROUTE_PATH}/wallet`, adminWalletRoutes);
  app.use(`/api/${env.ADMIN_ROUTE_PATH}/reports`, adminReportsRoutes);
  app.use(`/api/${env.ADMIN_ROUTE_PATH}/panel`, adminPanelRoutes);

  app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  serveBuiltApp(app, {
    candidates: [
      process.env.ADMIN_DIST_DIR,
      path.resolve(process.cwd(), '../admin-client/dist'),
      path.resolve(process.cwd(), './admin-client/dist')
    ],
    mountPath: `/${env.ADMIN_ROUTE_PATH}`
  });
  serveBuiltApp(app, {
    candidates: [
      process.env.CLIENT_DIST_DIR,
      path.resolve(process.cwd(), '../client/dist'),
      path.resolve(process.cwd(), './client/dist')
    ],
    mountPath: '/'
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function serveBuiltApp(app, { candidates, mountPath }) {
  const distDir = candidates.filter(Boolean).find((dir) => fs.existsSync(dir));
  if (!distDir) return;
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) return;
  app.use(mountPath, express.static(distDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get(`${mountPath}*`, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.sendFile(indexFile);
  });
  console.log(`Serving static build from ${distDir} at ${mountPath}`);
}
