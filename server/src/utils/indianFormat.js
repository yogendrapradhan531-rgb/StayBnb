/**
 * Indian-style money helpers used on tax invoices.
 *   formatINR(124500)          → "₹1,24,500.00"
 *   amountInWords(124500.5)    → "Rupees One Lakh Twenty-Four Thousand Five Hundred and Fifty Paise Only"
 */
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const formatINR = (n) => inr.format(Number(n) || 0);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

/** Whole number → words using the Indian system (thousand, lakh, crore). */
export function numberToIndianWords(num) {
  let n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
}

export function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const words = `Rupees ${numberToIndianWords(rupees)}`;
  return `${words}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

/** Indian financial year label for a date: Apr 2026 – Mar 2027 → "2026-27". */
export function financialYear(date = new Date()) {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1; // April = month 3
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
