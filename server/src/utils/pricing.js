import { calculateGst, round2 } from './gst.js';

export const SERVICE_FEE_RATE = 0.12;

/**
 * Server-side source of truth for a stay's price (the client only previews it).
 *   subtotal     = nightly price × nights
 *   serviceFee   = 12% of subtotal (platform fee)
 *   gst          = slab GST on (subtotal + cleaning) + 18% GST on the service fee
 *   totalPrice   = subtotal + cleaning + serviceFee + gst.total
 */
export function calculatePrice({ pricePerNight, cleaningFee = 0 }, nights) {
  const subtotal = round2(pricePerNight * nights);
  const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
  const gst = calculateGst({
    accommodationAmount: subtotal + cleaningFee,
    nightlyTariff: pricePerNight,
    serviceFee,
  });
  const totalPrice = round2(subtotal + cleaningFee + serviceFee + gst.total);
  return { subtotal, cleaningFee, serviceFee, gst, totalPrice };
}
