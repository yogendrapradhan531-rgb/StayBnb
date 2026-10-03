import { env } from '../config/env.js';
import { stripe, toStripeAmount } from '../config/stripe.js';
import { findConflict } from './availability.js';

const fmt = (d) => d.toISOString().slice(0, 10);

/**
 * Creates a Stripe Checkout Session for a pending booking.
 * The guest is redirected to Stripe's hosted page – card details never touch our server.
 */
export async function createCheckoutSession({ booking, listing, user }) {
  // Stripe requires expires_at to be 30 min – 24 h after creation
  const expiresAt = Math.floor(Date.now() / 1000) + env.paymentHoldMinutes * 60 + 60;
  const image = listing.images?.find((u) => /^https:\/\//.test(u));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(booking._id),
    metadata: { bookingId: String(booking._id), listingId: String(listing._id) },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: env.currency,
          unit_amount: toStripeAmount(booking.totalPrice),
          product_data: {
            name: listing.title,
            description: `${booking.nights} night(s) · ${fmt(booking.checkIn)} → ${fmt(booking.checkOut)} · ${booking.guests} guest(s)`,
            ...(image && { images: [image] }),
          },
        },
      },
    ],
    expires_at: expiresAt,
    success_url: `${env.appUrl}/bookings/${booking._id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/listings/${listing._id}?payment=cancelled&booking=${booking._id}`,
  });

  booking.stripeSessionId = session.id;
  booking.expiresAt = new Date(expiresAt * 1000);
  await booking.save();
  return session;
}

/**
 * Idempotently marks a booking as paid from a completed Checkout Session.
 * Called from both the redirect confirmation and the webhook – whichever runs first wins.
 */
export async function markBookingPaid(booking, session) {
  if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') return booking;

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  // Rare: the hold expired before payment finished. Re-confirm if the dates are
  // still free, otherwise refund automatically.
  if (booking.status === 'cancelled') {
    const conflict = await findConflict(booking.listing, booking.checkIn, booking.checkOut, {
      excludeBookingId: booking._id,
    });
    if (conflict) {
      if (paymentIntent) await stripe.refunds.create({ payment_intent: paymentIntent });
      booking.paymentStatus = 'refunded';
      booking.stripePaymentIntentId = paymentIntent;
      await booking.save();
      return booking;
    }
  }

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.paidAt = new Date();
  booking.stripePaymentIntentId = paymentIntent;
  booking.expiresAt = undefined;
  booking.cancelReason = '';
  booking.cancelledAt = undefined;
  await booking.save();
  return booking;
}
