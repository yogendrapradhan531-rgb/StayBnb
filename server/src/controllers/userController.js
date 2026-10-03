import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { ApiError } from '../utils/ApiError.js';
import { maskMobile, maskPan, normalizeMobile } from '../validation/india.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// PATCH /api/users/me   body: { name?, avatar?, bio?, location?, phone? }  (profileSchema)
export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'avatar', 'bio', 'location'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = String(req.body[key]).trim();
  }
  if (req.body.phone !== undefined) req.user.phone = normalizeMobile(req.body.phone);
  await req.user.save();
  res.json({ user: req.user });
});

/**
 * POST /api/users/me/verification   (hosts) body: { legalName, pan, phone, aadhaarLast4, consent }
 * Stores only masked identifiers, then puts the host in the admin review queue.
 */
export const submitVerification = asyncHandler(async (req, res) => {
  const v = req.user.hostVerification || {};
  if (v.status === 'verified') throw ApiError.badRequest('You’re already verified');
  if (v.status === 'pending') throw ApiError.badRequest('Your verification is already under review');

  const pan = String(req.body.pan).trim().toUpperCase();
  const phone = normalizeMobile(req.body.phone);
  req.user.phone = phone;
  req.user.hostVerification = {
    status: 'pending',
    legalName: String(req.body.legalName).trim(),
    panMasked: maskPan(pan),
    aadhaarLast4: String(req.body.aadhaarLast4),
    phoneMasked: maskMobile(phone),
    submittedAt: new Date(),
    rejectionReason: '',
  };
  await req.user.save();
  res.json({ user: req.user, message: 'Thanks! Your details are under review – this usually takes a day.' });
});

// PATCH /api/users/me/password   body: { currentPassword, newPassword }
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.validation({ currentPassword: 'That’s not your current password' });
  }
  if (currentPassword === newPassword) {
    throw ApiError.validation({ newPassword: 'Choose a password different from your current one' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});

// GET /api/users/me/stats   → small numbers for the profile page
export const getMyStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [trips, upcoming, reviews] = await Promise.all([
    Booking.countDocuments({ guest: req.user._id, status: 'confirmed', checkOut: { $lte: now } }),
    Booking.countDocuments({ guest: req.user._id, status: 'confirmed', checkOut: { $gt: now } }),
    Review.countDocuments({ author: req.user._id }),
  ]);
  res.json({ stats: { trips, upcoming, reviews, saved: req.user.wishlist.length } });
});

// GET /api/users/me/wishlist   → saved listings (inactive ones are filtered out)
export const getWishlist = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ _id: { $in: req.user.wishlist }, isActive: true, status: 'approved' })
    .populate('host', 'name avatar hostVerification.status')
    .lean();
  // Keep the order in which they were saved (newest first)
  const order = req.user.wishlist.map(String).reverse();
  listings.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
  res.json({ listings });
});

// POST /api/users/me/wishlist/:listingId
export const addToWishlist = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  if (!mongoose.isValidObjectId(listingId)) throw ApiError.badRequest('Invalid listing id');
  if (!(await Listing.exists({ _id: listingId }))) throw ApiError.notFound('Listing not found');

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: listingId } }, // no duplicates
    { new: true }
  );
  res.json({ wishlist: user.wishlist });
});

// DELETE /api/users/me/wishlist/:listingId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  if (!mongoose.isValidObjectId(listingId)) throw ApiError.badRequest('Invalid listing id');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: listingId } },
    { new: true }
  );
  res.json({ wishlist: user.wishlist });
});
