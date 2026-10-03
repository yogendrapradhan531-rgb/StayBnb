import { Booking } from '../models/Booking.js';
import { env } from '../config/env.js';
import { stripe, paymentsEnabled } from '../config/stripe.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { markBookingPaid } from '../utils/payments.js';

// GET /api/config   → public, non-secret settings the frontend needs
export const getConfig = (_req, res) => {
  res.json({ paymentsEnabled, currency: env.currency.toUpperCase(), gstEnabled: process.env.GST_ENABLED !== 'false' });
};

/**
 * GET /api/payments/confirm?session_id=cs_test_...
 * Called by the confirmation page after Stripe redirects back.
 * We ask Stripe directly (never trust the URL alone) whether it was paid.
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  if (!paymentsEnabled) throw ApiError.badRequest('Payments are not enabled on this server');
  const sessionId = String(req.query.session_id || '');
  if (!sessionId.startsWith('cs_')) throw ApiError.badRequest('A valid session_id is required');

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const booking = await Booking.findById(session.metadata?.bookingId);
  if (!booking) throw ApiError.notFound('Booking not found for this payment');
  if (!booking.guest.equals(req.user._id)) throw ApiError.forbidden('This is not your booking');

  if (session.payment_status === 'paid') await markBookingPaid(booking, session);

  await booking.populate([
    { path: 'listing', select: 'title images address location' },
    { path: 'guest', select: 'name email' },
  ]);
  res.json({ booking, paymentStatus: session.payment_status });
});

/**
 * POST /api/payments/webhook   (raw body – mounted before express.json in app.js)
 * Stripe calls this server-to-server. It's the reliable path in production:
 * it works even if the guest closes the tab before being redirected back.
 */
export const stripeWebhook = async (req, res) => {
  if (!stripe || !env.stripeWebhookSecret) {
    return res.status(400).json({ message: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    const session = event.data.object;
    const booking = session.metadata?.bookingId ? await Booking.findById(session.metadata.bookingId) : null;

    if (booking) {
      if (
        (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
        session.payment_status === 'paid'
      ) {
        await markBookingPaid(booking, session);
      }
      if (event.type === 'checkout.session.expired' && booking.status === 'pending') {
        booking.status = 'cancelled';
        booking.cancelReason = 'payment_expired';
        booking.cancelledAt = new Date();
        await booking.save();
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ message: 'Webhook handler failed' }); // Stripe will retry
  }
};
