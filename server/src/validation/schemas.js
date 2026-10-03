/**
 * Request schemas with friendly, specific messages.
 * The same wording is used on the client (client/src/utils/validation.js)
 * so users see one consistent voice whether a check runs in the browser or here.
 */
import {
  required, minLength, maxLength, matches, oneOf, number, isoDate, url, custom,
} from './validate.js';
import { INDIAN_STATES, PIN_CODE_RE, PAN_RE, MOBILE_RE, normalizeMobile } from './india.js';
import { AMENITIES, PROPERTY_TYPES } from './listingOptions.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const registerSchema = {
  name: [required('Please tell us your name'), minLength(2, 'Name should be at least 2 characters'), maxLength(60, 'Name should be 60 characters or fewer')],
  email: [required('Email is required'), matches(EMAIL_RE, 'That doesn’t look like a valid email – e.g. riya@gmail.com')],
  password: [
    required('Choose a password'),
    minLength(8, 'Use at least 8 characters for your password'),
    matches(/[A-Za-z]/, 'Password needs at least one letter'),
    matches(/\d/, 'Password needs at least one number'),
  ],
  role: [oneOf(['guest', 'host'], 'Choose whether you want to travel or host')],
};

export const loginSchema = {
  email: [required('Enter the email you signed up with'), matches(EMAIL_RE, 'That doesn’t look like a valid email')],
  password: [required('Enter your password')],
};

export const listingSchema = {
  title: [required('Give your place a title'), minLength(10, 'Titles need at least 10 characters – describe what makes it special'), maxLength(100, 'Keep the title under 100 characters')],
  description: [required('Add a description'), minLength(50, 'Write at least 50 characters so guests know what to expect'), maxLength(5000, 'Description is too long (max 5000 characters)')],
  propertyType: [required('Choose a property type'), oneOf(PROPERTY_TYPES, 'Choose a valid property type')],
  pricePerNight: [required('Set a nightly price'), number({ min: 300, max: 500000, integer: true }, {
    min: 'Nightly price must be at least ₹300',
    max: 'Nightly price can’t exceed ₹5,00,000',
    integer: 'Use a whole rupee amount (no paise)',
  })],
  cleaningFee: [number({ min: 0, max: 50000, integer: true }, { min: 'Cleaning fee can’t be negative', max: 'Cleaning fee can’t exceed ₹50,000', integer: 'Use a whole rupee amount' })],
  maxGuests: [required('How many guests can stay?'), number({ min: 1, max: 30, integer: true }, { min: 'At least 1 guest', max: 'Up to 30 guests' })],
  bedrooms: [number({ min: 0, max: 30, integer: true })],
  beds: [number({ min: 1, max: 50, integer: true }, { min: 'Add at least 1 bed' })],
  bathrooms: [number({ min: 0.5, max: 30 }, { min: 'Add at least one bathroom (0.5 for a shared one)' })],
  amenities: [custom((v) => (v === undefined || (Array.isArray(v) && v.every((a) => AMENITIES.includes(a))) ? null : 'One of the amenities isn’t recognised'))],
  images: [custom((v) => {
    if (v === undefined) return null;
    if (!Array.isArray(v) || v.length === 0) return 'Add at least one photo link';
    if (v.length > 10) return 'You can add up to 10 photos';
    if (v.some((u) => !/^https:\/\/\S+$/i.test(String(u).trim()))) return 'Photo links must start with https://';
    return null;
  })],
  'address.city': [required('Enter the town or city'), maxLength(60)],
  'address.state': [required('Choose the state'), oneOf(INDIAN_STATES, 'Choose a state or union territory from the list')],
  'address.pincode': [required('Enter the 6-digit PIN code'), matches(PIN_CODE_RE, 'PIN code must be 6 digits and can’t start with 0 – e.g. 560038')],
  'location.lat': [required('Drop a pin on the map to set the exact location'), number({ min: 6, max: 37.5 }, { min: 'That pin is outside India', max: 'That pin is outside India' })],
  'location.lng': [required('Drop a pin on the map to set the exact location'), number({ min: 68, max: 97.5 }, { min: 'That pin is outside India', max: 'That pin is outside India' })],
};

export const bookingSchema = {
  listingId: [required('Choose a listing to book')],
  checkIn: [required('Pick a check-in date'), isoDate()],
  checkOut: [required('Pick a check-out date'), isoDate()],
  guests: [required('How many guests?'), number({ min: 1, max: 30, integer: true }, { min: 'At least 1 guest' })],
};

export const reviewSchema = {
  bookingId: [required('Which stay are you reviewing?')],
  rating: [required('Choose a star rating'), number({ min: 1, max: 5, integer: true }, { min: 'Rating is 1 to 5 stars', max: 'Rating is 1 to 5 stars' })],
  comment: [required('Write a few words about your stay'), minLength(20, 'Reviews need at least 20 characters to be helpful'), maxLength(1000, 'Keep reviews under 1000 characters')],
};

export const profileSchema = {
  name: [minLength(2, 'Name should be at least 2 characters'), maxLength(60)],
  avatar: [url('Profile photo must be a link starting with http:// or https://')],
  bio: [maxLength(500, 'Keep your bio under 500 characters')],
  location: [maxLength(80)],
  phone: [custom((v) => (v === undefined || v === '' || MOBILE_RE.test(normalizeMobile(v)) ? null : 'Enter a 10-digit Indian mobile number, e.g. 98450 12345'))],
};

export const passwordSchema = {
  currentPassword: [required('Enter your current password')],
  newPassword: registerSchema.password,
};

export const verificationSchema = {
  legalName: [required('Enter your name exactly as on your PAN card'), minLength(3, 'Enter your full legal name')],
  pan: [required('Enter your PAN'), custom((v) => (PAN_RE.test(String(v || '').trim().toUpperCase()) ? null : 'PAN must be 10 characters like ABCDE1234F'))],
  phone: [required('Enter your mobile number'), custom((v) => (MOBILE_RE.test(normalizeMobile(v)) ? null : 'Enter a 10-digit Indian mobile number, e.g. 98450 12345'))],
  aadhaarLast4: [required('Enter the last 4 digits of your Aadhaar'), matches(/^\d{4}$/, 'Enter only the last 4 digits of your Aadhaar')],
  consent: [custom((v) => (v === true ? null : 'Please confirm the details are yours and accurate'))],
};

export const rejectSchema = {
  reason: [required('Tell the user why, so they can fix it'), minLength(10, 'Give a reason of at least 10 characters'), maxLength(300)],
};

export const blockSchema = {
  start: [required('Choose a start date'), isoDate()],
  end: [required('Choose an end date'), isoDate()],
  note: [maxLength(120, 'Keep the note under 120 characters')],
};
