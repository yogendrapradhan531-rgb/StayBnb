/**
 * India-specific reference data and format checks.
 * NOTE: client/src/utils/india.js mirrors this file – keep them in sync.
 */

export const INDIAN_STATES = [
  // States
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/** 6 digits, cannot start with 0 (India Post PIN code format). */
export const PIN_CODE_RE = /^[1-9][0-9]{5}$/;

/** PAN: 5 letters, 4 digits, 1 letter – e.g. ABCDE1234F. */
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Indian mobile: 10 digits starting 6–9 (after removing +91 / 0 prefix). */
export const MOBILE_RE = /^[6-9][0-9]{9}$/;

export function normalizeMobile(value = '') {
  const digits = String(value).replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, '');
  return digits;
}

/** ABCDE1234F → ABxxx1234F style mask: we never store or return the full PAN. */
export function maskPan(pan) {
  return `${pan.slice(0, 2)}XXX${pan.slice(5, 9)}${pan.slice(9)}`;
}

export function maskMobile(mobile) {
  return `XXXXXX${mobile.slice(-4)}`;
}
