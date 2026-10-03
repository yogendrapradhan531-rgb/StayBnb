import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import hostRoutes from './routes/hostRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { getConfig, stripeWebhook } from './controllers/paymentController.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Render/Heroku etc. sit behind a proxy – needed for correct IPs in rate limiting
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow tools like curl/Postman (no origin) and any configured client URL
        if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
        const err = new Error(`CORS blocked for origin ${origin}`);
        err.statusCode = 403;
        cb(err);
      },
    })
  );
  app.use(compression());
  // Stripe signs the exact raw bytes, so this route must see the body before JSON parsing
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }));
  app.get('/api/config', getConfig);

  app.use('/api/auth', authRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/host', hostRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
