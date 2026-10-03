import { Booking } from '../models/Booking.js';
import { Block } from '../models/Block.js';

/**
 * Bookings that currently occupy dates: confirmed ones, plus pending ones
 * whose payment hold hasn't expired yet.
 */
export function activeBookingFilter(now = new Date()) {
  return {
    $or: [
      { status: 'confirmed' },
      { status: 'pending', expiresAt: { $gt: now } },
    ],
  };
}

/** Half-open overlap: existing.start < newEnd AND existing.end > newStart */
const bookingOverlap = (checkIn, checkOut) => ({ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
const blockOverlap = (start, end) => ({ start: { $lt: end }, end: { $gt: start } });

/**
 * Returns a human-readable reason if the range is unavailable, else null.
 * `excludeBookingId` lets a pending booking ignore itself.
 */
export async function findConflict(listingId, checkIn, checkOut, { session = null, excludeBookingId } = {}) {
  const bookingQuery = {
    listing: listingId,
    ...bookingOverlap(checkIn, checkOut),
    ...activeBookingFilter(),
  };
  if (excludeBookingId) bookingQuery._id = { $ne: excludeBookingId };

  const [booking, block] = await Promise.all([
    Booking.findOne(bookingQuery).session(session).select('_id status').lean(),
    Block.findOne({ listing: listingId, ...blockOverlap(checkIn, checkOut) }).session(session).select('_id').lean(),
  ]);
  if (booking) return 'Those dates are no longer available. Please pick different dates.';
  if (block) return 'The host has blocked some of those dates.';
  return null;
}

/** Listing ids that are NOT free for the whole range (for search filtering). */
export async function busyListingIds(checkIn, checkOut) {
  const [booked, blocked] = await Promise.all([
    Booking.distinct('listing', { ...bookingOverlap(checkIn, checkOut), ...activeBookingFilter() }),
    Block.distinct('listing', blockOverlap(checkIn, checkOut)),
  ]);
  return [...booked, ...blocked];
}

/** Marks expired, unpaid holds as cancelled so they stop showing as pending. */
export async function expireStaleHolds() {
  const { modifiedCount } = await Booking.updateMany(
    { status: 'pending', expiresAt: { $lte: new Date() } },
    { $set: { status: 'cancelled', cancelReason: 'payment_expired', cancelledAt: new Date() } }
  );
  return modifiedCount;
}
