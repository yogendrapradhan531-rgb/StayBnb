/**
 * India-specific reference data and format checks.
 * Mirrors server/src/validation/india.js – keep them in sync.
 */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const PIN_CODE_RE = /^[1-9][0-9]{5}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const MOBILE_RE = /^[6-9][0-9]{9}$/;

export function normalizeMobile(value = '') {
  return String(value).replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, '');
}

/** Karnataka highlights used on the landing page. */
export const KARNATAKA_DESTINATIONS = [
  ['Coorg', '☕'],
  ['Chikkamagaluru', '⛰️'],
  ['Hampi', '🏛️'],
  ['Gokarna', '🏖️'],
  ['Mysuru', '🏰'],
  ['Bengaluru', '🌆'],
  ['Udupi', '🌊'],
  ['Kabini', '🐘'],
];

/** Geographic centre of Karnataka – default map view. */
export const KARNATAKA_CENTER = [15.3173, 75.7139];

/**
 * True if the text contains something that looks like a phone number:
 * 10 or more digits in a row, even with spaces, dashes, dots, brackets or +91 between them.
 * Short numbers like prices (₹2500), PIN codes (577411) or "2 bedrooms" are allowed.
 */
export function containsPhoneNumber(text = '') {
  const candidates = String(text).match(/\+?\d[\d\s\-().]{8,}\d/g) || [];
  return candidates.some((c) => c.replace(/\D/g, '').length >= 10);
}