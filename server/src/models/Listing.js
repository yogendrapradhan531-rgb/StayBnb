import mongoose from 'mongoose';
import { INDIAN_STATES, PIN_CODE_RE } from '../validation/india.js';

// Re-exported so existing imports keep working; defined without mongoose so validators are unit-testable
export { PROPERTY_TYPES, AMENITIES } from '../validation/listingOptions.js';
import { PROPERTY_TYPES, AMENITIES } from '../validation/listingOptions.js';

const listingSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, required: [true, 'Description is required'], maxlength: 5000 },
    propertyType: { type: String, enum: PROPERTY_TYPES, default: 'apartment' },
    images: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 10,
        message: 'Provide between 1 and 10 image URLs',
      },
    },
    pricePerNight: { type: Number, required: [true, 'Price is required'], min: 1 },
    cleaningFee: { type: Number, default: 0, min: 0 },
    maxGuests: { type: Number, required: true, min: 1, max: 50 },
    bedrooms: { type: Number, default: 1, min: 0 },
    beds: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    amenities: [{ type: String, enum: AMENITIES }],
    // India-only platform: state must be a real state/UT and PIN code is required
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, required: [true, 'Enter the town or city'], trim: true },
      state: {
        type: String,
        required: [true, 'Choose the state'],
        enum: { values: INDIAN_STATES, message: 'Choose a state or union territory from the list' },
      },
      pincode: {
        type: String,
        required: [true, 'Enter the 6-digit PIN code'],
        match: [PIN_CODE_RE, 'PIN code must be 6 digits and can’t start with 0'],
      },
      country: { type: String, default: 'India', enum: ['India'] },
    },
    // GeoJSON point – NOTE: MongoDB order is [longitude, latitude]
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: ([lng, lat]) =>
            typeof lng === 'number' && typeof lat === 'number' &&
            lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
          message: 'Coordinates must be [lng, lat] within valid ranges',
        },
      },
    },
    // Aggregated from reviews (see Review.recalculateListingStats)
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }, // host's own on/off switch

    /**
     * Listing approval workflow (admin moderation)
     *   pending → approved | rejected; material edits send an approved listing back to pending.
     * Only approved + active listings are visible in search and bookable.
     */
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    rejectionReason: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

listingSchema.index({ location: '2dsphere' });
listingSchema.index({ 'address.city': 1, pricePerNight: 1 });
listingSchema.index({ isActive: 1, status: 1, createdAt: -1 });

/** Fields whose change requires the listing to be re-approved. */
export const MATERIAL_FIELDS = ['title', 'description', 'images', 'address', 'location', 'propertyType'];

export const Listing = mongoose.model('Listing', listingSchema);
