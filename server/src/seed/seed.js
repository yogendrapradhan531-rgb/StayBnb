/**
 * Seeds the database with Indian demo data:
 *   - 1 admin, 2 verified hosts, 1 host awaiting verification, 5 guests
 *   - 16 approved listings (11 in Karnataka) + 1 pending + 1 rejected listing
 *   - past stays with reviews, upcoming trips, host-blocked dates, wishlists
 *   npm run seed
 * WARNING: wipes users, listings, bookings, reviews, blocks and counters.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { Block } from '../models/Block.js';
import { Counter } from '../models/Counter.js';
import { todayUtc } from '../utils/dates.js';
import { calculatePrice } from '../utils/pricing.js';
import { listingsData, moderationListings } from './data.js';

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const PASSWORD = 'password123';

const COMMENTS = [
  [5, 'Absolutely loved it. Spotless, great location and the host was super responsive on WhatsApp.'],
  [4, 'Lovely place, exactly as pictured. Check-in was smooth and the filter coffee was excellent!'],
  [5, 'One of the best stays we have had in India. Thoughtful touches everywhere – would come back.'],
  [3, 'Good value overall, though the road to the property is rough during the monsoon.'],
  [4, 'Comfortable beds, well-equipped kitchen and very clean. Power backup worked perfectly.'],
];

const verified = (legalName, panMasked, last4) => ({
  status: 'verified',
  legalName,
  panMasked,
  aadhaarLast4: last4,
  phoneMasked: `XXXXXX${last4}`,
  submittedAt: new Date(Date.now() - 30 * 86400000),
  reviewedAt: new Date(Date.now() - 29 * 86400000),
});

/** Booking document with the full price + GST snapshot. */
function bookingDoc({ listing, guest, checkIn, nights, guests = 2 }) {
  const price = calculatePrice(listing, nights);
  return {
    listing: listing._id,
    guest: guest._id,
    host: listing.host,
    checkIn,
    checkOut: addDays(checkIn, nights),
    nights,
    guests: Math.min(guests, listing.maxGuests),
    pricePerNight: listing.pricePerNight,
    cleaningFee: price.cleaningFee,
    serviceFee: price.serviceFee,
    gst: price.gst,
    totalPrice: price.totalPrice,
  };
}

async function seed() {
  await connectDB();

  console.log('Clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Block.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  console.log('Creating users…');
  // create() one by one so the password-hashing hook runs
  const admin = await User.create({ name: 'Staybnb Admin', email: 'admin@demo.com', password: PASSWORD, role: 'admin' });
  const hostA = await User.create({
    name: 'Aarav Hegde', email: 'host@demo.com', password: PASSWORD, role: 'host', phone: '9845012345',
    bio: 'Coorg-born, Bengaluru-based. I host plantation stays across Karnataka.',
    hostVerification: { ...verified('Aarav Hegde', 'ABXXX1234F', '1234'), reviewedBy: admin._id },
  });
  const hostB = await User.create({
    name: 'Meera Nair', email: 'host2@demo.com', password: PASSWORD, role: 'host', phone: '9886054321',
    bio: 'Architect turned host. I love restoring old homes.',
    hostVerification: { ...verified('Meera Nair', 'CDXXX5678K', '5678'), reviewedBy: admin._id },
  });
  const hostPending = await User.create({
    name: 'Rohan Gowda', email: 'newhost@demo.com', password: PASSWORD, role: 'host', phone: '9900112233',
    hostVerification: {
      status: 'pending', legalName: 'Rohan Gowda', panMasked: 'EFXXX9012L', aadhaarLast4: '9012',
      phoneMasked: 'XXXXXX2233', submittedAt: new Date(Date.now() - 86400000),
    },
  });
  const guest = await User.create({ name: 'Riya Sharma', email: 'guest@demo.com', password: PASSWORD, phone: '9123456780' });
  const reviewers = [];
  for (const [name, email] of [
    ['Kabir Mehta', 'kabir@demo.com'],
    ['Ananya Rao', 'ananya@demo.com'],
    ['Vikram Shetty', 'vikram@demo.com'],
    ['Neha Sharma', 'neha@demo.com'],
  ]) {
    reviewers.push(await User.create({ name, email, password: PASSWORD }));
  }

  console.log('Creating listings…');
  const now = new Date();
  const listings = await Listing.insertMany(
    listingsData.map((l, i) => ({
      ...l,
      host: i % 2 === 0 ? hostA._id : hostB._id,
      reviewedBy: admin._id,
      reviewedAt: now,
    }))
  );
  await Listing.insertMany(moderationListings.map((l) => ({ ...l, host: hostPending._id, submittedAt: now })));

  console.log('Creating bookings, reviews and invoices-ready stays…');
  const today = todayUtc();
  const allGuests = [guest, ...reviewers];

  for (const [j, listing] of listings.entries()) {
    // 2–4 past (completed) stays per listing, non-overlapping
    const stayCount = 2 + (j % 3);
    for (let k = 0; k < stayCount; k++) {
      const author = allGuests[(j + k) % allGuests.length];
      const booking = await Booking.create(
        bookingDoc({ listing, guest: author, checkIn: addDays(today, -(20 + 7 * k)), nights: 3 })
      );
      // Leave some of the demo guest's stays unreviewed so you can test reviewing
      if (author._id.equals(guest._id) && k === 0) continue;
      const [rating, comment] = COMMENTS[(j + k) % COMMENTS.length];
      await Review.create({ listing: listing._id, booking: booking._id, author: author._id, rating, comment });
    }
    await Review.recalculateListingStats(listing._id);
  }

  // Upcoming trips for the demo guest (date picker shows these as blocked)
  for (const [j, offset, nights] of [[1, 5, 2], [4, 10, 3], [6, 3, 4], [10, 14, 2]]) {
    await Booking.create(bookingDoc({ listing: listings[j], guest, checkIn: addDays(today, offset), nights }));
  }
  // One cancelled trip so the history filters have something to show
  await Booking.create({
    ...bookingDoc({ listing: listings[3], guest, checkIn: addDays(today, 25), nights: 2 }),
    status: 'cancelled',
    cancelReason: 'guest',
    cancelledAt: now,
  });

  // Host-blocked dates (unavailable for guests, hatched on the host calendar)
  await Block.create([
    { listing: listings[0]._id, host: listings[0].host, start: addDays(today, 12), end: addDays(today, 15), note: 'Coffee harvest – family visiting' },
    { listing: listings[2]._id, host: listings[2].host, start: addDays(today, 20), end: addDays(today, 23), note: 'Roof repairs' },
  ]);

  // Saved stays for the demo guest
  guest.wishlist = [listings[1]._id, listings[8]._id, listings[11]._id];
  await guest.save();

  console.log('\nSeed complete ✔  (password for every account: password123)');
  console.log('  Admin        : admin@demo.com');
  console.log('  Hosts        : host@demo.com, host2@demo.com (verified)');
  console.log('  New host     : newhost@demo.com (verification + listing awaiting admin review)');
  console.log('  Guest        : guest@demo.com');
  console.log('  More guests  : kabir@ / ananya@ / vikram@ / neha@demo.com');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
