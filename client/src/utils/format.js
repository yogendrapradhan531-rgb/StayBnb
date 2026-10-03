const CURRENCY = import.meta.env.VITE_CURRENCY || 'INR';
// en-IN gives Indian digit grouping: ₹1,24,500 (lakh/crore style)
const LOCALE = 'en-IN';

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const moneyFmtExact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,24,500 (rounded to the rupee – for prices and summaries). */
export const formatMoney = (n) => moneyFmt.format(Number(n) || 0);
/** ₹1,24,500.50 (exact – for invoices and tax lines). */
export const formatMoneyExact = (n) => moneyFmtExact.format(Number(n) || 0);

/** Local Date → "YYYY-MM-DD" (what the API expects). */
export function toISODate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" or an ISO string from the API → local Date at midnight. */
export function fromISODate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = value instanceof Date ? value : fromISODate(value);
  return d ? d.toLocaleDateString(LOCALE, opts) : '';
}

export function formatRange(checkIn, checkOut) {
  return `${formatDate(checkIn, { day: 'numeric', month: 'short' })} – ${formatDate(checkOut)}`;
}

export function nightsBetween(start, end) {
  if (!start || !end) return 0;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

export const SERVICE_FEE_RATE = 0.12;

// ---- GST (mirrors server/src/utils/gst.js – preview only, the server recalculates) ----
export const GST_SLABS = [
  { upTo: 1000, rate: 0 },
  { upTo: 7500, rate: 5 },
  { upTo: Infinity, rate: 18 },
];
export const SERVICE_FEE_GST_RATE = 18;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const gstRateFor = (nightlyTariff) => GST_SLABS.find((s) => nightlyTariff <= s.upTo).rate;

/** Mirrors server/src/utils/pricing.js. */
export function calculatePrice(listing, nights, { gstEnabled = true } = {}) {
  const subtotal = round2(listing.pricePerNight * nights);
  const cleaningFee = listing.cleaningFee || 0;
  const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
  const accommodationRate = gstEnabled ? gstRateFor(listing.pricePerNight) : 0;
  const accommodationGst = round2(((subtotal + cleaningFee) * accommodationRate) / 100);
  const serviceFeeGst = gstEnabled ? round2((serviceFee * SERVICE_FEE_GST_RATE) / 100) : 0;
  const gst = round2(accommodationGst + serviceFeeGst);
  return {
    subtotal,
    cleaningFee,
    serviceFee,
    accommodationRate,
    accommodationGst,
    serviceFeeGst,
    gst,
    total: round2(subtotal + cleaningFee + serviceFee + gst),
  };
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export function formatLocation(address = {}) {
  return [address.city, address.state].filter(Boolean).join(', ');
}

export function formatFullAddress(address = {}) {
  const line = [address.street, address.city].filter(Boolean).join(', ');
  return `${line}${line ? ', ' : ''}${address.state || ''}${address.pincode ? ` – ${address.pincode}` : ''}`;
}

const compactMoneyFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** ₹1.2L style – for chart axes and tight spaces. */
export const formatMoneyCompact = (n) => compactMoneyFmt.format(Number(n) || 0);
