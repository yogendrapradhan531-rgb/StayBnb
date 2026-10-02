# Staybnb 🏡 – Airbnb Clone (Full Stack)

Hi! This is my capstone project for the **SapphireIQ Full Stack Development** course.
It's an Airbnb-style booking site where you can search for stays, book them, pay, leave reviews,
and list your own place as a host.

I didn't want to make just another generic Airbnb clone, so I gave it an **Indian / Karnataka twist** –
prices in ₹, GST on bookings, proper GST invoices, Indian states + PIN codes, host verification with PAN,
and an admin panel to approve listings. Most of the demo stays are in Karnataka (Coorg, Hampi, Gokarna,
Chikkamagaluru, Mysuru…) because that's what I know best 🙂

**Tech stack:** React 18 (Vite) · Node.js + Express · MongoDB (Mongoose) · JWT auth · Stripe (test mode) ·
Leaflet + OpenStreetMap · react-datepicker

---

## ✨ Features

### Basic stuff (course modules 1–5)
- **Login / signup** with JWT, passwords hashed with bcrypt, separate guest / host / admin roles
- **Search & filters** – location, dates, guests, state, price range, bedrooms, amenities, property type, sorting, pagination
- **Map view** – price pins on a Leaflet map + a "Search this area" button
- **Booking flow** – date picker greys out booked nights, and the backend double-checks so the same dates can't get booked twice
- **Reviews** – only after you've actually checked out; average rating is recalculated automatically
- **Host dashboard** – add/edit/delete listings, see reservations, earnings and stats
- **Deployment ready** – configs for Render (backend) and Vercel/Netlify (frontend)

### Extra features I added
- 💳 **Stripe payments (test mode)** – "Reserve & pay" opens Stripe checkout, dates are held for 30 min while you pay, auto refund if you cancel. Works without Stripe too (bookings just confirm instantly).
- 🧾 **GST + tax invoice** – GST slab depends on the nightly price (0% up to ₹1,000, 5% up to ₹7,500, 18% above), shown as CGST + SGST. Every confirmed booking gets an invoice like `STB/2026-27/00001` that you can download as PDF.
- 🇮🇳 **Indian pricing & locations** – ₹1,24,500 style formatting, all Indian states/UTs, 6-digit PIN code check, map pins must be inside India.
- ✅ **Host verification** – hosts submit PAN, mobile and last 4 digits of Aadhaar. Only masked values are saved (privacy!). Admin approves → host gets a blue tick.
- 🛂 **Listing approval** – new listings stay hidden until an admin approves them. If a host changes photos/title/address later, it goes back for review.
- 🛠️ **Admin console** (`/admin`) – platform stats, approve/reject listings, verify hosts, suspend users.
- 📊 **Host analytics** – earnings and nights-booked charts, occupancy per listing, top listings.
- 📅 **Host calendar** – see bookings by month and block dates (like for maintenance).
- ❤️ **Wishlist**, 👤 **profile page**, 🌙 **dark mode**, toast notifications, and a booking history page with filters (status, search, dates, payment).
- ⚠️ **Proper error messages** – instead of "Error 400" you get stuff like *"PIN code must be 6 digits and can't start with 0 – e.g. 560038"* right under the field.

More details (how each extra feature works, which files, API) are in **[CUSTOM_FEATURES.md](CUSTOM_FEATURES.md)**.

---

## 📁 Folder structure

```
airbnb-clone/
├── package.json        # scripts to install/run both apps together
├── render.yaml         # Render deployment config
├── server/             # backend (Express API)
│   ├── .env.example    # copy this to .env
│   ├── test/           # unit tests (GST, validation, Indian formatting)
│   └── src/
│       ├── models/       # User, Listing, Booking, Review, Block, Counter
│       ├── controllers/  # the actual logic for each route
│       ├── routes/
│       ├── middleware/   # JWT auth, roles, error handler
│       ├── validation/   # form rules + Indian states, PAN, PIN code checks
│       ├── utils/        # GST, pricing, availability, payments…
│       └── seed/         # demo data
└── client/             # frontend (React + Vite)
    └── src/
        ├── pages/        # Home, ListingDetail, Trips, Invoice, Profile, host/, admin/
        ├── components/   # Navbar, ListingCard, BookingWidget, Map, Modal, charts…
        ├── context/      # auth, dark mode, toasts
        └── utils/        # formatting, validation, India helpers
```

---

## 🚀 How to run it on your laptop

**You need:** Node.js 18 or newer, and MongoDB (installed locally or a free MongoDB Atlas cluster).
No Google Maps key needed – the maps use OpenStreetMap, which is free.

```bash
# 1. install everything (root + server + client)
npm run install:all

# 2. create the backend settings file
cp server/.env.example server/.env        # on Windows PowerShell: Copy-Item server\.env.example server\.env
# then open server/.env and set MONGO_URI and JWT_SECRET

# 3. fill the database with demo data
npm run seed

# 4. start both backend and frontend
npm run dev
```

Then open **http://localhost:5173** 🎉 (the API runs on http://localhost:5000)

To make a random JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

To run the unit tests:
```bash
cd server
npm test
```

### Demo logins (password for all: `password123`)

| Who | Email | What to try |
|---|---|---|
| Admin | `admin@demo.com` | Admin console – approve listings, verify hosts |
| Host | `host@demo.com`, `host2@demo.com` | Dashboard, analytics, calendar |
| New host | `newhost@demo.com` | Verification pending + one pending & one rejected listing |
| Guest | `guest@demo.com` | Trips, wishlist, invoices, write a review |
| More guests | `kabir@demo.com`, `ananya@demo.com`, `vikram@demo.com`, `neha@demo.com` | |

> ⚠️ Running `npm run seed` again **deletes everything** and reloads the demo data.

### Stripe payments (optional)
1. Make a Stripe account and copy the **test** secret key (`sk_test_...`) from the dashboard.
2. Put it in `server/.env` as `STRIPE_SECRET_KEY=` and restart the server.
3. Pay with the test card **4242 4242 4242 4242**, any future date, any CVC.

Heads up: Stripe is invite-only for new Indian businesses right now, so you might not be able to make an account.
That's fine – just leave the key empty and bookings get confirmed without a payment step.

---

## 🧠 Some things I found interesting

**Stopping double bookings.** Two stays clash if `existing.checkIn < new.checkOut` AND `existing.checkOut > new.checkIn`
(so checkout day is free for the next guest). I check this in 3 places:
1. the date picker doesn't let you pick booked nights,
2. the API checks again (never trust the frontend!),
3. on MongoDB Atlas the booking is saved inside a transaction, so if two people click "Reserve" at the exact same time only one wins and the other gets a "dates no longer available" message.

On a normal local MongoDB (not a replica set) transactions don't work, so the code detects that and skips them.
It still works fine for testing.

**GST calculation.** The slab is decided by the price **per night**, not the total. The cleaning fee gets the same rate
as the stay, and the 12% service fee always has 18% GST. Then the total is split half CGST, half SGST.
Example: ₹6,500 × 3 nights + ₹800 cleaning → total **₹24,076.20** including ₹1,436.20 GST.
*(This is a simplified version for learning – not real tax advice.)*

**Invoice numbers.** They go up one by one per financial year (April–March) using an atomic counter in MongoDB,
so two invoices can never get the same number.

**Privacy.** For host verification the full PAN is never saved – only something like `ABXXX1234F`.

---

## 🔌 Main API routes

All routes start with `/api`. Logged-in routes need the header `Authorization: Bearer <token>`.

| Method | Route | What it does |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Sign up / log in |
| GET | `/listings` | Search (location, state, dates, guests, price, type, amenities, sort, page) |
| GET | `/listings/:id` | One listing |
| POST / PUT / DELETE | `/listings/:id` | Host creates / edits / deletes a listing |
| POST | `/bookings` | Book a stay |
| GET | `/bookings/me` | My trips (with filters) |
| GET | `/bookings/:id/invoice` | GST invoice |
| PATCH | `/bookings/:id/cancel` | Cancel (refund if paid) |
| POST | `/reviews` | Review a completed stay |
| GET | `/host/stats`, `/host/analytics` | Host dashboard numbers |
| POST | `/users/me/verification` | Host submits KYC details |
| GET / PATCH | `/admin/...` | Admin: stats, approvals, verifications, users |

Every error comes back in the same format: `{ message, code, errors }`, so the frontend can show the message
next to the right field. The full list of routes is in `CUSTOM_FEATURES.md`.

---

## ☁️ Deployment (how I'd deploy it)

1. **Database** – free cluster on MongoDB Atlas, allow access from anywhere (`0.0.0.0/0`), copy the connection string.
2. **Backend** – push to GitHub → Render → New Web Service, root folder `server`, build `npm install`, start `npm start`.
   Add `MONGO_URI`, `JWT_SECRET` and `CLIENT_URL` as environment variables.
3. **Frontend** – Vercel → import repo, root folder `client`, set `VITE_API_URL=https://<your-backend>.onrender.com/api`.
4. Put the Vercel URL into `CLIENT_URL` on Render so CORS allows it.

Note: Render's free plan sleeps, so the first request after a while can take ~30 seconds.

---

## 🐛 Known issues / limitations
- Photos are added as image links, not uploaded files.
- Hosts don't actually receive payouts (that would need Stripe Connect).
- GST rules are simplified (no registration thresholds, no credit notes for refunds).
- Without a replica set, local MongoDB has a tiny chance of a double booking if two requests hit at the exact same moment.

## 💡 What I want to add next
- Upload photos to Cloudinary
- Chat between guest and host
- Weekend / seasonal pricing
- Booking confirmation emails
- Integration tests for the booking API (Jest + Supertest)

---

## 🙏 Acknowledgements
- Project brief and roadmap: **SapphireIQ** Full Stack course
- Map data © OpenStreetMap contributors, demo photos from Unsplash
- I used Ai assistent as (Gemini) while building this project.I've run it, tested the features and understand how it works.

Made by **<Yogendra Pradhan>** ·  · 2026
