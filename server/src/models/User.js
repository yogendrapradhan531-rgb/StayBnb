import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: { type: String, enum: ['guest', 'host', 'admin'], default: 'guest' },
    phone: { type: String, default: '' }, // normalised 10-digit Indian mobile
    isSuspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },
    avatar: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (v) => !v || /^https?:\/\//i.test(v),
        message: 'Avatar must be an http(s) image URL',
      },
    },
    bio: { type: String, default: '', trim: true, maxlength: 500 },
    location: { type: String, default: '', trim: true, maxlength: 80 },
    // Saved listings ("hearted" stays)
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],

    /**
     * Host verification (KYC-lite). Privacy by design: the full PAN and Aadhaar
     * are never stored – only a masked PAN and the last 4 Aadhaar digits.
     * unverified → pending (host submits) → verified | rejected (admin reviews)
     */
    hostVerification: {
      status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
      legalName: { type: String, default: '' },
      panMasked: { type: String, default: '' },
      aadhaarLast4: { type: String, default: '' },
      phoneMasked: { type: String, default: '' },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

userSchema.index({ 'hostVerification.status': 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
