import { Listing, AMENITIES, PROPERTY_TYPES, MATERIAL_FIELDS } from '../models/Listing.js';
import { INDIAN_STATES } from '../validation/india.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toUtcDay, todayUtc } from '../utils/dates.js';
import { Block } from '../models/Block.js';
import { activeBookingFilter, busyListingIds } from '../utils/availability.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (v) => (v === undefined || v === '' ? undefined : Number(v));

const SORTS = {
  price_asc: { pricePerNight: 1 },
  price_desc: { pricePerNight: -1 },
  rating: { avgRating: -1, reviewCount: -1 },
  newest: { createdAt: -1 },
};

/** Whitelists fields a host may set – never trust req.body wholesale. */
function pickListingFields(body) {
  const allowed = [
    'title', 'description', 'propertyType', 'images', 'pricePerNight', 'cleaningFee',
    'maxGuests', 'bedrooms', 'beds', 'bathrooms', 'amenities', 'address', 'isActive',
  ];
  const data = {};
  for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];
  if (data.address) {
    const { street = '', city = '', state = '', pincode = '' } = data.address;
    data.address = {
      street: String(street).trim(),
      city: String(city).trim(),
      state,
      pincode: String(pincode).trim(),
      country: 'India',
    };
  }

  // Accept either { lat, lng } or a GeoJSON-style coordinates array
  if (body.location) {
    const { lat, lng, coordinates } = body.location;
    const coords = Array.isArray(coordinates) ? coordinates : [Number(lng), Number(lat)];
    data.location = { type: 'Point', coordinates: coords.map(Number) };
  }
  if (Array.isArray(data.images)) {
    data.images = data.images.map((s) => String(s).trim()).filter(Boolean);
  }
  return data;
}

// GET /api/listings/meta
export const getMeta = (_req, res) => {
  res.json({ amenities: AMENITIES, propertyTypes: PROPERTY_TYPES, states: INDIAN_STATES });
};

/**
 * GET /api/listings
 * Query: location, minPrice, maxPrice, guests, type, amenities (comma list),
 *        bedrooms, checkIn, checkOut, bounds (swLng,swLat,neLng,neLat),
 *        sort (price_asc|price_desc|rating|newest), page, limit
 */
export const getListings = asyncHandler(async (req, res) => {
  const q = req.query;
  // Only listings an admin has approved (and the host hasn't switched off) are public
  const filter = { isActive: true, status: 'approved' };

  if (q.state && INDIAN_STATES.includes(q.state)) filter['address.state'] = q.state;

  if (q.location) {
    const rx = new RegExp(escapeRegex(String(q.location).trim()), 'i');
    filter.$or = [
      { 'address.city': rx },
      { 'address.state': rx },
      { 'address.country': rx },
      { title: rx },
    ];
  }

  const minPrice = num(q.minPrice);
  const maxPrice = num(q.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.pricePerNight = {};
    if (minPrice !== undefined) filter.pricePerNight.$gte = minPrice;
    if (maxPrice !== undefined) filter.pricePerNight.$lte = maxPrice;
  }

  const guests = num(q.guests);
  if (guests) filter.maxGuests = { $gte: guests };

  const bedrooms = num(q.bedrooms);
  if (bedrooms) filter.bedrooms = { $gte: bedrooms };

  if (q.type && PROPERTY_TYPES.includes(q.type)) filter.propertyType = q.type;

  if (q.amenities) {
    const list = String(q.amenities).split(',').map((a) => a.trim()).filter(Boolean);
    if (list.length) filter.amenities = { $all: list };
  }

  // "Search this area" on the map → GeoJSON polygon of the visible viewport
  if (q.bounds) {
    const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
    const [swLng, swLat, neLng, neLat] = String(q.bounds).split(',').map(Number);
    if ([swLng, swLat, neLng, neLat].every(Number.isFinite)) {
      const w = clamp(swLng, 180);
      const e = clamp(neLng, 180);
      const s = clamp(swLat, 85);
      const n = clamp(neLat, 85);
      // Very zoomed-out maps would form a polygon wider than a hemisphere – skip the filter then
      if (e - w < 180 && e > w && n > s) {
        filter.location = {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
            },
          },
        };
      }
    }
  }

  // Availability: exclude listings with a booking (or host block) overlapping the dates
  const checkIn = toUtcDay(q.checkIn);
  const checkOut = toUtcDay(q.checkOut);
  if (checkIn && checkOut && checkOut > checkIn) {
    const busy = await busyListingIds(checkIn, checkOut);
    if (busy.length) filter._id = { $nin: busy };
  }

  const page = Math.max(1, num(q.page) || 1);
  const limit = Math.min(50, Math.max(1, num(q.limit) || 12));
  const sort = SORTS[q.sort] || SORTS.newest;

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('host', 'name avatar hostVerification.status')
      .lean(),
    Listing.countDocuments(filter),
  ]);

  res.json({ listings, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/listings/:id   (public if approved; owner/admin can preview pending/rejected)
export const getListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate(
    'host',
    'name avatar bio createdAt hostVerification.status'
  );
  if (!listing) throw ApiError.notFound('This listing doesn’t exist or has been removed');

  const isOwner = req.user && listing.host?._id.equals(req.user._id);
  const isAdmin = req.user?.role === 'admin';
  if (listing.status !== 'approved' && !isOwner && !isAdmin) {
    throw ApiError.notFound('This listing isn’t available yet');
  }
  res.json({ listing, canManage: Boolean(isOwner) });
});

// GET /api/listings/:id/availability  → unavailable ranges for the date picker
// `booked` includes host-blocked ranges so older clients keep working.
export const getAvailability = asyncHandler(async (req, res) => {
  const today = todayUtc();
  const [bookings, blocks] = await Promise.all([
    Booking.find({ listing: req.params.id, checkOut: { $gt: today }, ...activeBookingFilter() })
      .select('checkIn checkOut -_id')
      .sort({ checkIn: 1 })
      .lean(),
    Block.find({ listing: req.params.id, end: { $gt: today } }).select('start end -_id').lean(),
  ]);
  const blocked = blocks.map((b) => ({ checkIn: b.start, checkOut: b.end }));
  res.json({
    booked: [...bookings, ...blocked].sort((a, b) => a.checkIn - b.checkIn),
    blocked,
  });
});

// POST /api/listings   (host only) → always starts in the admin review queue
export const createListing = asyncHandler(async (req, res) => {
  const listing = await Listing.create({
    ...pickListingFields(req.body),
    host: req.user._id,
    status: 'pending',
    submittedAt: new Date(),
  });
  res.status(201).json({
    listing,
    message: 'Listing submitted! Our team will review it – usually within 24 hours.',
  });
});

async function findOwnedListing(id, user) {
  const listing = await Listing.findById(id);
  if (!listing) throw ApiError.notFound('Listing not found');
  if (!listing.host.equals(user._id)) throw ApiError.forbidden('You can only manage your own listings', { code: ERROR_CODES.FORBIDDEN });
  return listing;
}

// PUT /api/listings/:id   (owner only)
export const updateListing = asyncHandler(async (req, res) => {
  const listing = await findOwnedListing(req.params.id, req.user);
  const updates = pickListingFields(req.body);
  listing.set(updates);

  // Approval workflow: material edits (photos, title, address…) need a fresh review.
  // Price/amenity tweaks and the on/off switch don't.
  const materialChange = MATERIAL_FIELDS.some((f) => updates[f] !== undefined && listing.isModified(f));
  let message = 'Changes saved';
  if (listing.status === 'rejected' || (listing.status === 'approved' && materialChange)) {
    listing.status = 'pending';
    listing.rejectionReason = '';
    listing.submittedAt = new Date();
    message = 'Changes saved and sent for review. The listing is hidden until it’s approved again.';
  }
  await listing.save();
  res.json({ listing, message });
});

// DELETE /api/listings/:id   (owner only)
export const deleteListing = asyncHandler(async (req, res) => {
  const listing = await findOwnedListing(req.params.id, req.user);

  const upcoming = await Booking.countDocuments({
    listing: listing._id,
    checkOut: { $gt: todayUtc() },
    ...activeBookingFilter(),
  });
  if (upcoming > 0) {
    throw ApiError.conflict(
      `This listing has ${upcoming} upcoming booking(s). Cancel them or deactivate the listing instead.`
    );
  }

  const hasHistory = await Booking.exists({ listing: listing._id });
  if (hasHistory) {
    // Keep past bookings meaningful for guests – archive instead of hard delete
    listing.isActive = false;
    await listing.save();
    return res.json({ message: 'Listing archived (it has past bookings)', archived: true });
  }

  await Promise.all([
    Review.deleteMany({ listing: listing._id }),
    Block.deleteMany({ listing: listing._id }),
  ]);
  await listing.deleteOne();
  res.json({ message: 'Listing deleted', archived: false });
});
