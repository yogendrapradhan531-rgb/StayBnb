import mongoose from 'mongoose';
import { Listing } from './Listing.js';

const reviewSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    // One review per booking (per completed stay)
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, required: [true, 'Comment is required'], trim: true, maxlength: 1000 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

/**
 * Review aggregation: recompute a listing's average rating and count
 * from its individual reviews and store them on the listing so that
 * search results never need to join reviews.
 */
reviewSchema.statics.recalculateListingStats = async function recalc(listingId, session) {
  const [stats] = await this.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(String(listingId)) } },
    { $group: { _id: '$listing', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]).session(session || null);

  await Listing.findByIdAndUpdate(
    listingId,
    {
      avgRating: stats ? Math.round(stats.avgRating * 100) / 100 : 0,
      reviewCount: stats ? stats.reviewCount : 0,
    },
    { session }
  );
};

export const Review = mongoose.model('Review', reviewSchema);
