import mongoose from 'mongoose';

/**
 * Atomic sequence generator (e.g. invoice numbers per financial year).
 * findOneAndUpdate + $inc is atomic in MongoDB, so two requests can never
 * receive the same number.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "invoice-2026-27"
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
};

export const Counter = mongoose.model('Counter', counterSchema);
