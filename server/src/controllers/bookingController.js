import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';
import { supportsTransactions } from '../config/db.js';
import { env } from '../config/env.js';
import { stripe, paymentsEnabled } from '../config/stripe.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nightsBetween, toUtcDay, todayUtc } from '../utils/dates.js';
import { calculatePrice } from '../utils/pricing.js';
import { expireStaleHolds, findConflict } from '../utils/availability.js';
import { createCheckoutSession, markBookingPaid } from '../utils/payments.js';

const MAX_NIGHTS = 90;

/**
 * Core booking write. Runs inside a transaction when available.
 *
 * Double-booking protection, layer by layer:
 *  1. UI: the date picker disables booked/blocked nights.
 *  2. API: we re-check overlap here – the client is never trusted.
 *  3. DB: inside a transaction we first "touch" the listing document.
 *     Two concurrent transactions writing the same document conflict, so
 *     MongoDB aborts one; withTransaction() retries it, the retry sees the
 *     other booking in the overlap check, and responds 409.
 *
 * With payments enabled the booking starts as `pending` and holds the dates
 * until the Stripe Checkout session expires.
 */
async function writeBooking({ listingId, guestId, checkIn, checkOut, guests }, session) {
  const listing = await Listing.findOneAndUpdate(
    { _id: listingId },
    { $set: { updatedAt: new Date() } }, // the "lock" write
    { session, new: true }
  );
  if (!listing) throw ApiError.notFound('This listing doesn’t exist any more');
  if (!listing.isActive || listing.status !== 'approved') {
    throw ApiError.badRequest('This place isn’t accepting bookings right now', { code: ERROR_CODES.LISTING_NOT_BOOKABLE });
  }
  if (listing.host.equals(guestId)) {
    throw ApiError.badRequest('You can’t book your own listing', { code: ERROR_CODES.LISTING_NOT_BOOKABLE });
  }
  if (guests > listing.maxGuests) {
    throw ApiError.validation({ guests: `This place allows at most ${listing.maxGuests} guests` });
    const minNights = listing.minNights || 1;
  if (nightsBetween(checkIn, checkOut) < minNights) {
    throw ApiError.validation({ checkOut: `This place needs a minimum stay of ${minNights} nights` });
  }
  }


  const conflict = await findConflict(listing._id, checkIn, checkOut, { session });
  if (conflict) throw ApiError.conflict(conflict, { code: ERROR_CODES.DATES_UNAVAILABLE });

  const nights = nightsBetween(checkIn, checkOut);
  const price = calculatePrice(listing, nights);

  const paymentFields = paymentsEnabled
    ? {
        status: 'pending',
        paymentStatus: 'unpaid',
        // +2 min buffer; replaced with the exact Stripe session expiry below
        expiresAt: new Date(Date.now() + (env.paymentHoldMinutes + 2) * 60 * 1000),
      }
    : { status: 'confirmed', paymentStatus: 'not_required' };

  const [booking] = await Booking.create(
    [
      {
        listing: listing._id,
        guest: guestId,
        host: listing.host,
        checkIn,
        checkOut,
        nights,
        guests,
        pricePerNight: listing.pricePerNight,
        cleaningFee: price.cleaningFee,
        serviceFee: price.serviceFee,
        gst: price.gst,
        totalPrice: price.totalPrice,
        ...paymentFields,
      },
    ],
    { session }
  );
  return { booking, listing };
}

// POST /api/bookings   body: { listingId, checkIn: 'YYYY-MM-DD', checkOut, guests }
// → { booking, checkoutUrl? }   (checkoutUrl only when Stripe is configured)
export const createBooking = asyncHandler(async (req, res) => {
  const { listingId } = req.body;
  const checkIn = toUtcDay(req.body.checkIn);
  const checkOut = toUtcDay(req.body.checkOut);
  const guests = Number(req.body.guests) || 1;

  // Shape is checked by bookingSchema in the route; these are the business rules
  if (!mongoose.isValidObjectId(listingId)) throw ApiError.validation({ listingId: 'That listing link looks broken' });
  if (!checkIn || !checkOut) throw ApiError.validation({ checkIn: 'Pick valid check-in and check-out dates' });
  if (checkIn < todayUtc()) throw ApiError.validation({ checkIn: 'Check-in can’t be in the past' });
  if (checkOut <= checkIn) throw ApiError.validation({ checkOut: 'Check-out must be at least one night after check-in' });
  if (nightsBetween(checkIn, checkOut) > MAX_NIGHTS) {
    throw ApiError.validation({ checkOut: `Stays are limited to ${MAX_NIGHTS} nights – for longer stays, message the host` });
  }

  const input = { listingId, guestId: req.user._id, checkIn, checkOut, guests };
  let result;

  if (await supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        result = await writeBooking(input, session);
      });
    } finally {
      await session.endSession();
    }
    result.booking.$session(null); // detach the ended session before further queries
  } else {
    // Standalone MongoDB (local dev): no transactions, small race window remains.
    result = await writeBooking(input, null);
  }

  const { booking, listing } = result;
  let checkoutUrl;

  if (paymentsEnabled) {
    try {
      const checkout = await createCheckoutSession({ booking, listing, user: req.user });
      checkoutUrl = checkout.url;
    } catch (err) {
      // Release the dates if Stripe is unreachable or rejects the request
      booking.status = 'cancelled';
      booking.cancelReason = 'payment_expired';
      booking.cancelledAt = new Date();
      await booking.save();
      console.error('Stripe checkout error:', err.message);
      throw new ApiError(502, `We couldn’t start the payment: ${err.message}`, { code: ERROR_CODES.PAYMENT_FAILED });
    }
  }

  await booking.populate('listing', 'title images address');
  res.status(201).json({ booking, checkoutUrl });
});

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOOKING_SORTS = {
  newest: (a, b) => b.checkIn - a.checkIn,
  oldest: (a, b) => a.checkIn - b.checkIn,
  price_high: (a, b) => b.totalPrice - a.totalPrice,
  price_low: (a, b) => a.totalPrice - b.totalPrice,
  booked_recent: (a, b) => b.createdAt - a.createdAt,
};

/** Which history bucket a booking falls in (used for filters and counts). */
function bucketOf(b, now) {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'pending') return 'pending';
  return new Date(b.checkOut) <= now ? 'completed' : 'upcoming';
}

/**
 * GET /api/bookings/me   → the logged-in guest's trips, with history filters
 * Query:
 *   status   all | upcoming | completed | cancelled | pending
 *   q        text search on listing title / city / state
 *   from,to  YYYY-MM-DD – trips overlapping this window
 *   payment  paid | unpaid | refunded | not_required
 *   sort     newest | oldest | price_high | price_low | booked_recent
 * Response includes `counts` per status so the UI can show badges.
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const q = req.query;
  const now = new Date();

  const all = await Booking.find({ guest: req.user._id })
    .populate('listing', 'title images address location pricePerNight')
    .lean();

  const reviewed = await Review.find({ booking: { $in: all.map((b) => b._id) } }).select('booking').lean();
  const reviewedIds = new Set(reviewed.map((r) => String(r.booking)));

  const enriched = all.map((b) => ({
    ...b,
    bucket: bucketOf(b, now),
    isCompleted: b.status === 'confirmed' && new Date(b.checkOut) <= now,
    hasReviewed: reviewedIds.has(String(b._id)),
  }));

  // Counts ignore the status filter (so every chip shows its own total)
  const textRx = q.q ? new RegExp(escapeRegex(String(q.q).trim()), 'i') : null;
  const from = toUtcDay(q.from);
  const to = toUtcDay(q.to);
  if (from && to && to < from) throw ApiError.validation({ to: '“To” date must be after the “From” date' });

  const baseFiltered = enriched.filter((b) => {
    if (textRx) {
      const l = b.listing || {};
      const hay = [l.title, l.address?.city, l.address?.state].filter(Boolean).join(' ');
      if (!textRx.test(hay)) return false;
    }
    if (from && new Date(b.checkOut) <= from) return false;
    if (to && new Date(b.checkIn) > to) return false;
    if (q.payment && b.paymentStatus !== q.payment) return false;
    return true;
  });

  const counts = { all: baseFiltered.length, upcoming: 0, completed: 0, cancelled: 0, pending: 0 };
  baseFiltered.forEach((b) => { counts[b.bucket] += 1; });

  const status = q.status && q.status !== 'all' ? q.status : null;
  const bookings = baseFiltered
    .filter((b) => !status || b.bucket === status)
    .sort(BOOKING_SORTS[q.sort] || BOOKING_SORTS.newest);

  res.json({ bookings, counts, total: enriched.length });
});

async function findBookingForParticipant(id, user) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid booking id');
  const booking = await Booking.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found');
  const isGuest = booking.guest.equals(user._id);
  const isHost = booking.host.equals(user._id);
  const isAdmin = user.role === 'admin';
  if (!isGuest && !isHost && !isAdmin) throw ApiError.forbidden('This booking belongs to someone else');
  return { booking, isGuest, isHost, isAdmin };
}

// GET /api/bookings/:id
export const getBooking = asyncHandler(async (req, res) => {
  const { booking } = await findBookingForParticipant(req.params.id, req.user);
  await booking.populate([
    { path: 'listing', select: 'title images address location' },
    { path: 'guest', select: 'name email' },
  ]);
  res.json({ booking });
});

// POST /api/bookings/:id/pay   → resume an unfinished Stripe checkout
export const resumePayment = asyncHandler(async (req, res) => {
  const { booking, isGuest } = await findBookingForParticipant(req.params.id, req.user);
  if (!isGuest) throw ApiError.forbidden('Only the guest can pay for this booking');
  if (!paymentsEnabled) throw ApiError.badRequest('Payments are not enabled on this server');
  if (booking.status !== 'pending') throw ApiError.badRequest(`This booking is ${booking.status}`);

  const session = booking.stripeSessionId
    ? await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
    : null;

  if (session?.status === 'complete' && session.payment_status === 'paid') {
    await markBookingPaid(booking, session);
    return res.json({ booking });
  }
  if (session?.status === 'open' && booking.expiresAt > new Date()) {
    return res.json({ checkoutUrl: session.url });
  }

  booking.status = 'cancelled';
  booking.cancelReason = 'payment_expired';
  booking.cancelledAt = new Date();
  await booking.save();
  throw new ApiError(410, 'The 30-minute payment window has expired and the dates were released. Please book again.', {
    code: ERROR_CODES.PAYMENT_EXPIRED,
  });
});

// PATCH /api/bookings/:id/cancel   (guest or host)
export const cancelBooking = asyncHandler(async (req, res) => {
  const { booking, isGuest } = await findBookingForParticipant(req.params.id, req.user);
  if (booking.status === 'cancelled') throw ApiError.badRequest('Booking is already cancelled');

  if (booking.status === 'pending') {
    // Abandoned checkout – close the Stripe session so it can't be paid later
    if (stripe && booking.stripeSessionId) {
      try {
        await stripe.checkout.sessions.expire(booking.stripeSessionId);
      } catch {
        /* already expired/complete – the webhook/confirm step handles that */
      }
    }
  } else {
    if (booking.checkIn <= todayUtc()) {
      throw ApiError.badRequest('Bookings can only be cancelled before the check-in date');
    }
    if (booking.paymentStatus === 'paid' && stripe && booking.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
        booking.paymentStatus = 'refunded';
      } catch (err) {
        throw new ApiError(502, `The refund failed, so the booking was not cancelled: ${err.message}`, { code: ERROR_CODES.PAYMENT_FAILED });
      }
    }
  }

  booking.status = 'cancelled';
  booking.cancelReason = isGuest ? 'guest' : 'host';
  booking.cancelledAt = new Date();
  await booking.save();
  res.json({ booking });
});
