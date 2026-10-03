import mongoose from 'mongoose';

/**
 * Dates a host has blocked on their calendar (maintenance, personal use…).
 * Same half-open convention as bookings: nights start … end-1 are unavailable.
 */
const blockSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

blockSchema.index({ listing: 1, start: 1, end: 1 });

blockSchema.pre('validate', function ensureOrder(next) {
  if (this.start && this.end && this.end <= this.start) {
    this.invalidate('end', 'End date must be after start date');
  }
  next();
});

export const Block = mongoose.model('Block', blockSchema);
