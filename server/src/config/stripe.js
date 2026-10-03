import Stripe from 'stripe';
import { env } from './env.js';

/**
 * Stripe is optional. When STRIPE_SECRET_KEY is missing the app keeps working:
 * bookings are confirmed immediately and no payment step is shown.
 * Use TEST keys (sk_test_...) – test cards like 4242 4242 4242 4242 never charge money.
 */
export const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
export const paymentsEnabled = Boolean(stripe);

if (env.stripeSecretKey && !env.stripeSecretKey.startsWith('sk_test_') && !env.isProd) {
  console.warn('⚠ STRIPE_SECRET_KEY is not a test key. Use sk_test_... while developing.');
}

/** Currencies like INR/USD use 2 decimal places → amount in the smallest unit (paise/cents). */
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xof', 'xaf', 'ugx', 'rwf', 'kmf', 'gnf', 'bif', 'djf', 'mga', 'vuv', 'xpf']);
export function toStripeAmount(amount) {
  return ZERO_DECIMAL.has(env.currency) ? Math.round(amount) : Math.round(amount * 100);
}
