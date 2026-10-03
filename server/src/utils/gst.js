/**
 * GST for short-stay accommodation in India (simplified, for learning purposes).
 *
 * Accommodation slab is decided by the tariff actually charged PER NIGHT
 * (rates effective 22 Sep 2025):
 *     tariff ≤ ₹1,000          → 0%  (exempt)
 *     ₹1,001 – ₹7,500          → 5%  (no input tax credit)
 *     above ₹7,500             → 18%
 * The platform's own service fee is a separate service taxed at 18%.
 *
 * Because accommodation is taxed where the property is (place of supply =
 * location of the property), the tax is shown as CGST + SGST, half each.
 *
 * This is NOT tax advice – real platforms also handle GST registration
 * thresholds, e-commerce operator rules, credit notes, etc.
 */
export const GST_ENABLED = process.env.GST_ENABLED !== 'false';

export const GST_SLABS = [
  { upTo: 1000, rate: 0 },
  { upTo: 7500, rate: 5 },
  { upTo: Infinity, rate: 18 },
];
export const SERVICE_FEE_GST_RATE = 18;

/** SAC code used on invoices: 996311 – room or unit accommodation services. */
export const ACCOMMODATION_SAC = '996311';

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function accommodationGstRate(nightlyTariff) {
  if (!GST_ENABLED) return 0;
  return GST_SLABS.find((s) => nightlyTariff <= s.upTo).rate;
}

/**
 * @param {number} accommodationAmount  nightly total + cleaning fee
 * @param {number} nightlyTariff        price per night (decides the slab)
 * @param {number} serviceFee           platform fee
 */
export function calculateGst({ accommodationAmount, nightlyTariff, serviceFee }) {
  const accommodationRate = accommodationGstRate(nightlyTariff);
  const serviceFeeRate = GST_ENABLED ? SERVICE_FEE_GST_RATE : 0;
  const accommodation = round2((accommodationAmount * accommodationRate) / 100);
  const service = round2((serviceFee * serviceFeeRate) / 100);
  const total = round2(accommodation + service);
  const cgst = round2(total / 2);
  return {
    accommodationRate,
    accommodation,
    serviceFeeRate,
    serviceFee: service,
    cgst,
    sgst: round2(total - cgst), // avoids losing a paisa to rounding
    total,
  };
}
