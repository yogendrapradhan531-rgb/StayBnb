import mongoose from 'mongoose';

/**
 * Status lifecycle
 *   pending   – created, waiting for Stripe payment (dates held until expiresAt)
 *   confirmed – paid (or payments disabled)
 *   cancelled – cancelled by guest/host, or payment never completed
 */
const bookingSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Denormalised so the host dashboard can query its bookings directly
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    // Price snapshot at booking time (listing price may change later)
    pricePerNight: { type: Number, required: true },
    cleaningFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },

    // GST snapshot (see utils/gst.js). Accommodation slab depends on the nightly tariff.
    gst: {
      accommodationRate: { type: Number, default: 0 }, // 0, 5 or 18 (%)
      accommodation: { type: Number, default: 0 }, // GST on (nightly total + cleaning fee)
      serviceFeeRate: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 }, // GST on the platform service fee
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    totalPrice: { type: Number, required: true }, // what the guest pays, GST included

    // Tax invoice – number assigned the first time an invoice is generated
    invoiceNumber: { type: String, unique: true, sparse: true },
    invoiceDate: Date,
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    cancelReason: { type: String, enum: ['', 'guest', 'host', 'payment_expired'], default: '' },
    cancelledAt: Date,

    // Payments (Stripe Checkout)
    paymentStatus: {
      type: String,
      enum: ['not_required', 'unpaid', 'paid', 'refunded'],
      default: 'not_required',
    },
    stripeSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: String,
    paidAt: Date,
    // Pending bookings release their dates after this time
    expiresAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true } }
);

// Supports the overlap query used for availability + double-booking checks
bookingSchema.index({ listing: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ guest: 1, checkIn: -1 });

bookingSchema.pre('validate', function ensureOrder(next) {
  if (this.checkIn && this.checkOut && this.checkOut <= this.checkIn) {
    this.invalidate('checkOut', 'Check-out must be after check-in');
  }
  next();
});

// A stay is "completed" once the guest has checked out – required before reviewing
bookingSchema.virtual('isCompleted').get(function isCompleted() {
  return this.status === 'confirmed' && this.checkOut <= new Date();
});

export const Booking = mongoose.model('Booking', bookingSchema);
