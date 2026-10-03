import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { paymentsEnabled } from './config/stripe.js';
import { createApp } from './app.js';
import { expireStaleHolds } from './utils/availability.js';

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
    console.log(paymentsEnabled ? 'Stripe payments: ON (test mode recommended)' : 'Stripe payments: OFF – bookings confirm instantly');
  });

  // Release dates held by checkouts that were never paid
  const sweep = () => expireStaleHolds().catch((err) => console.error('Hold sweep failed:', err.message));
  sweep();
  setInterval(sweep, 5 * 60 * 1000).unref();
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
