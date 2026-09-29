import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { notFound } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';

dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
  override: false,
});

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// Database connection middleware (connects lazily and caches across serverless invocations)
app.use(async (req, res, next) => {
  // Allow health check to pass without blocking if DB is pending
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('[MongoDB Error]', error.message);
    res.status(500).json({
      message: 'Database connection failed. Please ensure MONGO_URI is configured correctly in environment variables.',
      error: error.message,
    });
  }
});

// Route definitions (mounted on both /api/* and /* for compatibility with Vercel rewrites)
const routes = [
  ['/auth', authRoutes],
  ['/assets', assetRoutes],
  ['/portfolio', portfolioRoutes],
  ['/orders', orderRoutes],
  ['/watchlist', watchlistRoutes],
  ['/alerts', alertRoutes],
  ['/notifications', notificationRoutes],
  ['/wallet', walletRoutes],
  ['/admin', adminRoutes],
];

for (const [path, router] of routes) {
  app.use(`/api${path}`, router);
  app.use(path, router);
}

// Health check endpoint
const healthCheckHandler = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    serverless: !!process.env.VERCEL,
  });
};
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

// Standalone server mode (for local development or container deployment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[Express] Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Startup Error]', err.message);
      app.listen(PORT, () => {
        console.log(`[Express] Server running on port ${PORT} (DB not yet connected)`);
      });
    });
}

export default app;

