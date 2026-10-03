import dotenv from 'dotenv';

// Loads server/.env in development. In production the host injects env vars.
dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls,
  // First CLIENT_URL is where Stripe sends guests back after checkout
  appUrl: clientUrls[0],
  currency: (process.env.CURRENCY || 'INR').toLowerCase(),
  // Optional – without a key, bookings are confirmed instantly (no payment step)
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // How long dates are held while the guest is on the Stripe checkout page
  // (Stripe's minimum session lifetime is 30 minutes)
  paymentHoldMinutes: Math.max(30, Number(process.env.PAYMENT_HOLD_MINUTES) || 30),
};
