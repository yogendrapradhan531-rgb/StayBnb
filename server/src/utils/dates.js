const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses "YYYY-MM-DD" (or any ISO string) into a Date at UTC midnight.
 * Bookings are stored as whole days so timezones never shift a stay.
 */
export function toUtcDay(value) {
  if (!value) return null;
  const str = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/**
 * Two stays overlap when one starts before the other ends.
 * Check-out day is free for the next guest's check-in (half-open interval).
 * Mongo filter: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
 */
export function overlapFilter(checkIn, checkOut) {
  return { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } };
}
