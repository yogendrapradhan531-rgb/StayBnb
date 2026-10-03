import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Booking } from '../models/Booking.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayUtc } from '../utils/dates.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = (n) => Math.round((n || 0) * 100) / 100;
const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'none', r.count]));

/**
 * GET /api/admin/stats – platform-wide numbers for the admin overview:
 * users by role, verification queue, listings by status, bookings,
 * gross booking value (GBV), GST collected and platform fee revenue,
 * plus a 6-month GBV series.
 */
export const getAdminStats = asyncHandler(async (_req, res) => {
  const today = todayUtc();
  const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const [roles, suspended, verifications, listingStatus, bookingStatus, money, monthly, topStates] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isSuspended: true }),
    User.aggregate([{ $match: { role: 'host' } }, { $group: { _id: '$hostVerification.status', count: { $sum: 1 } } }]),
    Listing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          gbv: { $sum: '$totalPrice' },
          gst: { $sum: '$gst.total' },
          fees: { $sum: '$serviceFee' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { status: 'confirmed', checkIn: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$checkIn' } },
          gbv: { $sum: '$totalPrice' },
          bookings: { $sum: 1 },
        },
      },
    ]),
    Listing.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$address.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
  ]);

  const byMonth = Object.fromEntries(monthly.map((m) => [m._id, m]));
  const series = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return {
      month: key,
      label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      gbv: round2(byMonth[key]?.gbv),
      bookings: byMonth[key]?.bookings || 0,
    };
  });

  const m = money[0] || {};
  res.json({
    users: { ...countBy(roles), suspended },
    verifications: countBy(verifications),
    listings: countBy(listingStatus),
    bookings: countBy(bookingStatus),
    revenue: { gbv: round2(m.gbv), gst: round2(m.gst), platformFees: round2(m.fees) },
    monthly: series,
    topStates: topStates.map((s) => ({ state: s._id, listings: s.count })),
  });
});

// ---------------------------------------------------------------- listings

// GET /api/admin/listings?status=pending|approved|rejected|all&q=
export const getAdminListings = asyncHandler(async (req, res) => {
  const filter = {};
  const status = req.query.status || 'pending';
  if (status !== 'all') filter.status = status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ title: rx }, { 'address.city': rx }, { 'address.state': rx }];
  }
  const listings = await Listing.find(filter)
    .sort({ submittedAt: status === 'pending' ? 1 : -1 }) // oldest first in the queue
    .limit(200)
    .populate('host', 'name email hostVerification.status')
    .populate('reviewedBy', 'name')
    .lean();
  res.json({ listings });
});

async function loadListing(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('That listing ID doesn’t look right');
  const listing = await Listing.findById(id).populate('host', 'name hostVerification.status');
  if (!listing) throw ApiError.notFound('Listing not found');
  return listing;
}

// PATCH /api/admin/listings/:id/approve
export const approveListing = asyncHandler(async (req, res) => {
  const listing = await loadListing(req.params.id);
  // Business rule: only identity-verified hosts can have public listings
  if (listing.host?.hostVerification?.status !== 'verified') {
    throw ApiError.badRequest('Verify the host first – listings from unverified hosts can’t go live', {
      code: ERROR_CODES.HOST_NOT_VERIFIED,
    });
  }
  listing.status = 'approved';
  listing.rejectionReason = '';
  listing.reviewedAt = new Date();
  listing.reviewedBy = req.user._id;
  await listing.save();
  res.json({ listing, message: `“${listing.title}” is now live` });
});

// PATCH /api/admin/listings/:id/reject   body: { reason }
export const rejectListing = asyncHandler(async (req, res) => {
  const listing = await loadListing(req.params.id);
  listing.status = 'rejected';
  listing.rejectionReason = String(req.body.reason).trim();
  listing.reviewedAt = new Date();
  listing.reviewedBy = req.user._id;
  await listing.save();
  res.json({ listing, message: 'Listing rejected – the host will see your reason' });
});

// ---------------------------------------------------------------- host verification

// GET /api/admin/verifications?status=pending|verified|rejected|all
export const getVerifications = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  const filter = { role: 'host' };
  if (status !== 'all') filter['hostVerification.status'] = status;
  const hosts = await User.find(filter)
    .select('name email avatar createdAt hostVerification')
    .sort({ 'hostVerification.submittedAt': 1 })
    .lean();

  // How many listings each host has – useful context for the reviewer
  const counts = await Listing.aggregate([
    { $match: { host: { $in: hosts.map((h) => h._id) } } },
    { $group: { _id: '$host', count: { $sum: 1 } } },
  ]);
  const byHost = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json({ hosts: hosts.map((h) => ({ ...h, listingCount: byHost[String(h._id)] || 0 })) });
});

async function loadHost(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('That user ID doesn’t look right');
  const user = await User.findById(id);
  if (!user || user.role !== 'host') throw ApiError.notFound('Host not found');
  return user;
}

// PATCH /api/admin/verifications/:userId/approve
export const approveVerification = asyncHandler(async (req, res) => {
  const user = await loadHost(req.params.userId);
  if (user.hostVerification?.status !== 'pending') {
    throw ApiError.badRequest('Only pending verifications can be approved');
  }
  user.hostVerification.status = 'verified';
  user.hostVerification.reviewedAt = new Date();
  user.hostVerification.reviewedBy = req.user._id;
  user.hostVerification.rejectionReason = '';
  await user.save();
  res.json({ user, message: `${user.name} is now a verified host` });
});

// PATCH /api/admin/verifications/:userId/reject   body: { reason }
export const rejectVerification = asyncHandler(async (req, res) => {
  const user = await loadHost(req.params.userId);
  if (user.hostVerification?.status !== 'pending') {
    throw ApiError.badRequest('Only pending verifications can be rejected');
  }
  user.hostVerification.status = 'rejected';
  user.hostVerification.rejectionReason = String(req.body.reason).trim();
  user.hostVerification.reviewedAt = new Date();
  user.hostVerification.reviewedBy = req.user._id;
  await user.save();
  res.json({ user, message: 'Verification rejected – the host can fix and resubmit' });
});

// ---------------------------------------------------------------- users

// GET /api/admin/users?q=&role=&page=
export const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (['guest', 'host', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.suspended === 'true') filter.isSuspended = true;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email avatar role isSuspended suspendedReason createdAt hostVerification.status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) || 1 });
});

// PATCH /api/admin/users/:id/suspend   body: { reason }
export const suspendUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('That user ID doesn’t look right');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Admins can’t be suspended from here');
  user.isSuspended = true;
  user.suspendedReason = String(req.body.reason).trim();
  await user.save();
  // Hide a suspended host's listings from search
  if (user.role === 'host') await Listing.updateMany({ host: user._id }, { $set: { isActive: false } });
  res.json({ user, message: `${user.name} has been suspended` });
});

// PATCH /api/admin/users/:id/unsuspend
export const unsuspendUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('That user ID doesn’t look right');
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isSuspended: false, suspendedReason: '' } },
    { new: true }
  );
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user, message: `${user.name} can use Staybnb again (their listings stay unlisted until they relist them)` });
});
