import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { Booking } from '../models/Booking.js';
import { Block } from '../models/Block.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nightsBetween, toUtcDay, todayUtc } from '../utils/dates.js';
import { activeBookingFilter, expireStaleHolds, findConflict } from '../utils/availability.js';

// Host payout for a booking = nightly total + cleaning fee (guest service fee excluded)
const PAYOUT = { $add: [{ $multiply: ['$pricePerNight', '$nights'] }, '$cleaningFee'] };
const round2 = (n) => Math.round((n || 0) * 100) / 100;

// GET /api/host/listings   → all of my listings (active + inactive) with booking counts
export const getHostListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ host: req.user._id }).sort({ createdAt: -1 }).lean();

  const counts = await Booking.aggregate([
    { $match: { host: req.user._id, status: 'confirmed', checkOut: { $gt: todayUtc() } } },
    { $group: { _id: '$listing', upcoming: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.upcoming]));

  res.json({
    listings: listings.map((l) => ({ ...l, upcomingBookings: byId[String(l._id)] || 0 })),
  });
});

// GET /api/host/bookings?scope=upcoming|past|cancelled|all
export const getHostBookings = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const today = todayUtc();
  const scope = req.query.scope || 'upcoming';
  let filter = { host: req.user._id };

  // "upcoming" also shows pending bookings that are mid-payment
  if (scope === 'upcoming') filter = { ...filter, checkOut: { $gt: today }, ...activeBookingFilter() };
  if (scope === 'past') filter = { ...filter, status: 'confirmed', checkOut: { $lte: today } };
  if (scope === 'cancelled') filter.status = 'cancelled';

  const bookings = await Booking.find(filter)
    .sort({ checkIn: scope === 'upcoming' ? 1 : -1 })
    .populate('listing', 'title images address')
    .populate('guest', 'name email avatar')
    .lean();

  res.json({ bookings });
});

// GET /api/host/stats
export const getHostStats = asyncHandler(async (req, res) => {
  const today = todayUtc();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const hostId = req.user._id;

  const [listingAgg, bookingAgg] = await Promise.all([
    Listing.aggregate([
      { $match: { host: hostId } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          activeListings: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalReviews: { $sum: '$reviewCount' },
          // weighted by review count so a 1-review listing doesn't skew the average
          ratingSum: { $sum: { $multiply: ['$avgRating', '$reviewCount'] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { host: hostId, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalEarnings: { $sum: PAYOUT },
          monthEarnings: { $sum: { $cond: [{ $gte: ['$checkIn', monthStart] }, PAYOUT, 0] } },
          upcomingBookings: { $sum: { $cond: [{ $gt: ['$checkOut', today] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const l = listingAgg[0] || {};
  const b = bookingAgg[0] || {};
  res.json({
    stats: {
      totalListings: l.totalListings || 0,
      activeListings: l.activeListings || 0,
      totalReviews: l.totalReviews || 0,
      avgRating: l.totalReviews ? round2(l.ratingSum / l.totalReviews) : 0,
      totalBookings: b.totalBookings || 0,
      upcomingBookings: b.upcomingBookings || 0,
      totalEarnings: round2(b.totalEarnings),
      monthEarnings: round2(b.monthEarnings),
    },
  });
});

/**
 * GET /api/host/analytics?months=6|12
 *  - monthly: earnings, bookings and nights per check-in month
 *  - occupancy: share of nights booked this month, per active listing
 *  - topListings: earnings per listing over the period
 *  - summary: totals, average nightly rate, average stay, cancellation rate
 */
export const getHostAnalytics = asyncHandler(async (req, res) => {
  const months = [3, 6, 12].includes(Number(req.query.months)) ? Number(req.query.months) : 6;
  const hostId = req.user._id;
  const today = todayUtc();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const periodStart = new Date(Date.UTC(y, m - (months - 1), 1));
  const periodEnd = new Date(Date.UTC(y, m + 1, 1)); // end of current month
  const monthStart = new Date(Date.UTC(y, m, 1));

  const [monthlyAgg, topAgg, cancelAgg, listings, monthBookings] = await Promise.all([
    Booking.aggregate([
      { $match: { host: hostId, status: 'confirmed', checkIn: { $gte: periodStart, $lt: periodEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$checkIn' } },
          earnings: { $sum: PAYOUT },
          bookings: { $sum: 1 },
          nights: { $sum: '$nights' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { host: hostId, status: 'confirmed', checkIn: { $gte: periodStart, $lt: periodEnd } } },
      { $group: { _id: '$listing', earnings: { $sum: PAYOUT }, bookings: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'listings', localField: '_id', foreignField: '_id', as: 'listing' } },
      { $unwind: '$listing' },
      { $project: { earnings: 1, bookings: 1, title: '$listing.title', city: '$listing.address.city' } },
    ]),
    Booking.aggregate([
      { $match: { host: hostId, createdAt: { $gte: periodStart }, status: { $in: ['confirmed', 'cancelled'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Listing.find({ host: hostId, isActive: true }).select('title').lean(),
    Booking.find({
      host: hostId,
      status: 'confirmed',
      checkIn: { $lt: periodEnd },
      checkOut: { $gt: monthStart },
    })
      .select('listing checkIn checkOut')
      .lean(),
  ]);

  // Fill every month in the period, including months with no bookings
  const byMonth = Object.fromEntries(monthlyAgg.map((r) => [r._id, r]));
  const monthly = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m - (months - 1) + i, 1));
    const key = d.toISOString().slice(0, 7);
    const row = byMonth[key] || {};
    return {
      month: key,
      label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      earnings: round2(row.earnings),
      bookings: row.bookings || 0,
      nights: row.nights || 0,
    };
  });

  // Occupancy this month: nights booked inside the month / days in month
  const daysInMonth = nightsBetween(monthStart, periodEnd);
  const nightsByListing = {};
  for (const b of monthBookings) {
    const start = b.checkIn > monthStart ? b.checkIn : monthStart;
    const end = b.checkOut < periodEnd ? b.checkOut : periodEnd;
    const n = Math.max(0, nightsBetween(start, end));
    nightsByListing[String(b.listing)] = (nightsByListing[String(b.listing)] || 0) + n;
  }
  const occupancy = listings
    .map((l) => {
      const booked = nightsByListing[String(l._id)] || 0;
      return { listingId: l._id, title: l.title, nights: booked, rate: Math.round((booked / daysInMonth) * 100) };
    })
    .sort((a, b) => b.rate - a.rate);

  const totals = monthly.reduce(
    (acc, r) => ({ earnings: acc.earnings + r.earnings, bookings: acc.bookings + r.bookings, nights: acc.nights + r.nights }),
    { earnings: 0, bookings: 0, nights: 0 }
  );
  const counts = Object.fromEntries(cancelAgg.map((c) => [c._id, c.count]));
  const created = (counts.confirmed || 0) + (counts.cancelled || 0);

  res.json({
    months,
    monthly,
    occupancy,
    occupancyMonth: monthStart.toISOString().slice(0, 7),
    topListings: topAgg.map((t) => ({ ...t, earnings: round2(t.earnings) })),
    summary: {
      earnings: round2(totals.earnings),
      bookings: totals.bookings,
      nights: totals.nights,
      avgNightlyRate: totals.nights ? round2(totals.earnings / totals.nights) : 0,
      avgStayLength: totals.bookings ? Math.round((totals.nights / totals.bookings) * 10) / 10 : 0,
      cancellationRate: created ? Math.round(((counts.cancelled || 0) / created) * 100) : 0,
    },
  });
});

async function findOwnListing(id, user) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid listing id');
  const listing = await Listing.findById(id).select('title host images pricePerNight');
  if (!listing) throw ApiError.notFound('Listing not found');
  if (!listing.host.equals(user._id)) throw ApiError.forbidden('You can only manage your own listings');
  return listing;
}

// GET /api/host/listings/:id/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getListingCalendar = asyncHandler(async (req, res) => {
  const listing = await findOwnListing(req.params.id, req.user);
  const from = toUtcDay(req.query.from) || todayUtc();
  const to = toUtcDay(req.query.to) || new Date(from.getTime() + 62 * 86400000);
  if (to <= from) throw ApiError.badRequest('"to" must be after "from"');

  const [bookings, blocks] = await Promise.all([
    Booking.find({
      listing: listing._id,
      checkIn: { $lt: to },
      checkOut: { $gt: from },
      ...activeBookingFilter(),
    })
      .select('checkIn checkOut guests status paymentStatus totalPrice guest nights')
      .populate('guest', 'name email avatar')
      .sort({ checkIn: 1 })
      .lean(),
    Block.find({ listing: listing._id, start: { $lt: to }, end: { $gt: from } }).sort({ start: 1 }).lean(),
  ]);

  res.json({ listing, bookings, blocks });
});

// POST /api/host/listings/:id/blocks   body: { start, end, note? }  (end exclusive)
export const createBlock = asyncHandler(async (req, res) => {
  const listing = await findOwnListing(req.params.id, req.user);
  const start = toUtcDay(req.body.start);
  const end = toUtcDay(req.body.end);
  if (!start || !end) throw ApiError.badRequest('start and end must be dates (YYYY-MM-DD)');
  if (start < todayUtc()) throw ApiError.badRequest('You cannot block dates in the past');
  if (end <= start) throw ApiError.badRequest('End must be after start');

  const conflict = await findConflict(listing._id, start, end);
  if (conflict) {
    throw ApiError.conflict('Those dates overlap an existing booking or block.');
  }

  const block = await Block.create({
    listing: listing._id,
    host: req.user._id,
    start,
    end,
    note: req.body.note || '',
  });
  res.status(201).json({ block });
});

// DELETE /api/host/listings/:id/blocks/:blockId
export const deleteBlock = asyncHandler(async (req, res) => {
  const listing = await findOwnListing(req.params.id, req.user);
  if (!mongoose.isValidObjectId(req.params.blockId)) throw ApiError.badRequest('Invalid block id');
  const block = await Block.findOneAndDelete({ _id: req.params.blockId, listing: listing._id });
  if (!block) throw ApiError.notFound('Block not found');
  res.json({ message: 'Dates unblocked' });
});
