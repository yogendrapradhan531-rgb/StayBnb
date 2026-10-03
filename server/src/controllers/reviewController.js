import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Booking } from '../models/Booking.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/listings/:id/reviews?page=1&limit=10
export const getListingReviews = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid listing id');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = { listing: req.params.id };

  const [reviews, total, breakdown] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean(),
    Review.countDocuments(filter),
    // Star breakdown, e.g. { 5: 12, 4: 3, ... }
    Review.aggregate([
      { $match: { listing: new mongoose.Types.ObjectId(String(req.params.id)) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    breakdown: Object.fromEntries(breakdown.map((b) => [b._id, b.count])),
  });
});

// POST /api/reviews   body: { bookingId, rating, comment }
export const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('A valid bookingId is required');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!booking.guest.equals(req.user._id)) throw ApiError.forbidden('You can only review stays you booked');
  if (!booking.isCompleted) throw ApiError.badRequest('You can leave a review after you check out');

  const review = await Review.create({
    listing: booking.listing,
    booking: booking._id,
    author: req.user._id,
    rating: Number(rating),
    comment,
  });
  await Review.recalculateListingStats(booking.listing);
  await review.populate('author', 'name avatar');
  res.status(201).json({ review });
});

async function findOwnReview(id, user) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid review id');
  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');
  if (!review.author.equals(user._id)) throw ApiError.forbidden('You can only edit your own reviews');
  return review;
}

// PUT /api/reviews/:id
export const updateReview = asyncHandler(async (req, res) => {
  const review = await findOwnReview(req.params.id, req.user);
  if (req.body.rating !== undefined) review.rating = Number(req.body.rating);
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();
  await Review.recalculateListingStats(review.listing);
  res.json({ review });
});

// DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await findOwnReview(req.params.id, req.user);
  await review.deleteOne();
  await Review.recalculateListingStats(review.listing);
  res.json({ message: 'Review deleted' });
});
