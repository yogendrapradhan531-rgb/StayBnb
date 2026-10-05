/**
 * Client-side form validation. Messages match server/src/validation/schemas.js
 * word-for-word, so the user sees the same guidance whether a check runs in
 * the browser (instantly) or on the server (as the final authority).
 */
import { INDIAN_STATES, MOBILE_RE, PAN_RE, PIN_CODE_RE, normalizeMobile, containsPhoneNumber } from './india.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

/** Returns { field: message } for the first failing rule of each field (empty object = valid). */
function collect(checks) {
  const errors = {};
  for (const [field, fns] of Object.entries(checks)) {
    for (const fn of fns) {
      const msg = fn();
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  }
  return errors;
}

export function validateRegister(f) {
  return collect({
    name: [() => blank(f.name) && 'Please tell us your name', () => f.name.trim().length < 2 && 'Name should be at least 2 characters'],
    email: [() => blank(f.email) && 'Email is required', () => !EMAIL_RE.test(f.email.trim()) && 'That doesn’t look like a valid email – e.g. riya@gmail.com'],
    password: [
      () => blank(f.password) && 'Choose a password',
      () => f.password.length < 8 && 'Use at least 8 characters for your password',
      () => !/[A-Za-z]/.test(f.password) && 'Password needs at least one letter',
      () => !/\d/.test(f.password) && 'Password needs at least one number',
    ],
  });
}

export function validateLogin(f) {
  return collect({
    email: [() => blank(f.email) && 'Enter the email you signed up with', () => !EMAIL_RE.test(f.email.trim()) && 'That doesn’t look like a valid email'],
    password: [() => blank(f.password) && 'Enter your password'],
  });
}

export function validateListing(f, images) {
  const price = Number(f.pricePerNight);
  return collect({
    title: [() => blank(f.title) && 'Give your place a title', () => f.title.trim().length < 10 && 'Titles need at least 10 characters – describe what makes it special'],
    description: [() => blank(f.description) && 'Add a description', () => f.description.trim().length < 50 && 'Write at least 50 characters so guests know what to expect', () => containsPhoneNumber(f.description) && 'Please remove the phone number – contact details aren’t allowed in listings, so every booking goes through Staybnb'],
    pricePerNight: [
      () => blank(f.pricePerNight) && 'Set a nightly price',
      () => !Number.isInteger(price) && 'Use a whole rupee amount (no paise)',
      () => price < 300 && 'Nightly price must be at least ₹300',
      () => price > 500000 && 'Nightly price can’t exceed ₹5,00,000',
    ],
    cleaningFee: [() => Number(f.cleaningFee) < 0 && 'Cleaning fee can’t be negative'],
    maxGuests: [() => !(Number(f.maxGuests) >= 1) && 'At least 1 guest', () => Number(f.maxGuests) > 30 && 'Up to 30 guests'],
    beds: [() => !(Number(f.beds) >= 1) && 'Add at least 1 bed'],
    bathrooms: [() => !(Number(f.bathrooms) >= 0.5) && 'Add at least one bathroom (0.5 for a shared one)'],
    images: [
      () => images.length === 0 && 'Add at least one photo link',
      () => images.length > 10 && 'You can add up to 10 photos',
      () => images.some((u) => !/^https:\/\/\S+$/i.test(u)) && 'Photo links must start with https://',
    ],
    'address.city': [() => blank(f.address.city) && 'Enter the town or city'],
    'address.state': [() => !INDIAN_STATES.includes(f.address.state) && 'Choose the state'],
    'address.pincode': [
      () => blank(f.address.pincode) && 'Enter the 6-digit PIN code',
      () => !PIN_CODE_RE.test(f.address.pincode.trim()) && 'PIN code must be 6 digits and can’t start with 0 – e.g. 560038',
    ],
    location: [() => !f.location && 'Drop a pin on the map to set the exact location'],
  });
}

export function validateVerification(f) {
  return collect({
    legalName: [() => blank(f.legalName) && 'Enter your name exactly as on your PAN card', () => f.legalName.trim().length < 3 && 'Enter your full legal name'],
    pan: [() => blank(f.pan) && 'Enter your PAN', () => !PAN_RE.test(f.pan.trim().toUpperCase()) && 'PAN must be 10 characters like ABCDE1234F'],
    phone: [() => blank(f.phone) && 'Enter your mobile number', () => !MOBILE_RE.test(normalizeMobile(f.phone)) && 'Enter a 10-digit Indian mobile number, e.g. 98450 12345'],
    aadhaarLast4: [() => !/^\d{4}$/.test(f.aadhaarLast4) && 'Enter only the last 4 digits of your Aadhaar'],
    consent: [() => !f.consent && 'Please confirm the details are yours and accurate'],
  });
}

export function validatePassword(f) {
  return collect({
    currentPassword: [() => blank(f.currentPassword) && 'Enter your current password'],
    newPassword: [
      () => f.newPassword.length < 8 && 'Use at least 8 characters for your password',
      () => !/[A-Za-z]/.test(f.newPassword) && 'Password needs at least one letter',
      () => !/\d/.test(f.newPassword) && 'Password needs at least one number',
    ],
    confirm: [() => f.newPassword !== f.confirm && 'Passwords don’t match'],
  });
}

export const isMobileValid = (v) => blank(v) || MOBILE_RE.test(normalizeMobile(v));

/** Pulls the server's field errors ({ errors: { field: msg } }) out of an axios error. */
export function fieldErrorsFrom(err) {
  return err?.response?.data?.errors || {};
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
