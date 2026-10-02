# Staybnb – Custom Features

This file documents the features that go **beyond the SapphireIQ base curriculum** (backend foundation,
listings & search, booking flow, maps/reviews/dashboard, deployment). The goal was to turn a generic
Airbnb clone into a platform built for **Indian homestays, with a Karnataka focus**.

| # | Feature | What's different from a generic clone |
|---|---------|----------------------------------------|
| 1 | Indian ₹ pricing | `en-IN` lakh/crore digit grouping, paise-exact tax lines, amounts in words |
| 2 | Karnataka / Indian locations | India-only addresses: real states/UTs, 6-digit PIN codes, map pins checked against India's bounds |
| 3 | GST calculation | Tariff-based slabs (0 / 5 / 18 %), 18 % on the service fee, CGST + SGST split, stored per booking |
| 4 | GST tax invoice | Sequential invoice numbers per financial year, SAC code, amount in words, print-to-PDF |
| 5 | Host verification | PAN / mobile / Aadhaar-last-4 checks; only masked identifiers are stored; admin review |
| 6 | Listing approval workflow | pending → approved / rejected; material edits trigger re-review |
| 7 | Custom admin dashboard | Platform KPIs, approval and verification queues, user suspension |
| 8 | Booking history filters | Status, text search, date range, payment status and sort, with per-status counts |
| 9 | Custom validation & error messages | Shared rule engine, field-level messages, stable error codes |
| 10 | Wishlist / favourites | Heart button with optimistic updates, wishlist page |

> **Disclaimer:** the GST logic is simplified for learning purposes and is not tax advice. The invoice is a
> demo document and is labelled as such.

---

## 1. Indian ₹ pricing

**Goal.** Prices should look the way Indian users expect: ₹1,24,500 (not ₹124,500), and tax lines should be exact
to the paisa.

**How it works**
- Every money and date formatter uses the `en-IN` locale: `formatMoney` for summaries (₹24,076) and `formatMoneyExact`
  for tax lines (₹24,076.20). Chart axes use compact Indian notation (₹1.2L).
- Listing prices must be whole rupees, between ₹300 and ₹5,00,000 per night.
- Invoices print the total **in words using the Indian system**, for example
  *"Rupees One Lakh Twenty-Four Thousand Five Hundred Only"*.

**Files.** `client/src/utils/format.js`, `server/src/utils/indianFormat.js` (`numberToIndianWords`, `amountInWords`,
`financialYear`, `formatINR`).

---

## 2. Karnataka / Indian locations

**Goal.** The platform is India-only, with Karnataka as the home market.

**How it works**
- The `Listing.address` model has `state` (an enum of all 28 states and 8 union territories), `pincode` (validated
  against `^[1-9][0-9]{5}$`) and `country` fixed to India.
- Request validation rejects map pins outside India's bounding box (lat 6–37.5, lng 68–97.5).
- The seed data contains **11 Karnataka stays** (Coorg, Chikkamagaluru, Hampi, Gokarna, Mysuru, Bengaluru ×2, Udupi,
  Kabini, Sakleshpur, Dandeli) and 5 elsewhere in India. Their prices were chosen to cover every GST slab.
- The landing page has "Explore Karnataka" quick picks. Maps centre on Karnataka by default.
- The search filters include a **State** filter (`GET /api/listings?state=Karnataka`).
- When a host locates their address on the map, geocoding is restricted to India (`countrycodes=in`) and includes
  the PIN code.

**Files.** `server/src/validation/india.js`, `client/src/utils/india.js`, `server/src/models/Listing.js`,
`server/src/seed/data.js`, `client/src/components/Hero.jsx`, `client/src/components/FilterBar.jsx`.

---

## 3. GST calculation

**Rules implemented** (accommodation rates effective 22 Sep 2025):

| Nightly tariff | GST on the stay |
|---|---|
| up to ₹1,000 | 0 % (exempt) |
| ₹1,001 – ₹7,500 | 5 % |
| above ₹7,500 | 18 % |
| Platform service fee (12 % of the nightly total) | 18 % |

- The slab is chosen by the **price per night**. The cleaning fee is taxed at the same rate because it is part of
  the accommodation supply.
- Accommodation is taxed where the property is, so the total is split equally into **CGST + SGST**. The split
  `sgst = total − cgst` makes sure no paisa is lost to rounding.
- The full breakdown is **snapshotted on the booking** (`booking.gst`), so later rate changes never alter old bookings.
- The booking widget shows a live preview, with an expandable GST breakdown and a slab hint before dates are picked.
  The server recalculates everything, so the client is never trusted.
- Hosts see which slab their price falls into while editing a listing.
- GST can be switched off with `GST_ENABLED=false`.

**Example (Coorg cottage, ₹6,500 × 3 nights + ₹800 cleaning):**
subtotal ₹19,500 · service fee ₹2,340 · GST 5 % on ₹20,300 = ₹1,015 · GST 18 % on ₹2,340 = ₹421.20 ·
CGST ₹718.10 + SGST ₹718.10 · **total ₹24,076.20**

**Files.** `server/src/utils/gst.js`, `server/src/utils/pricing.js`, `client/src/utils/format.js` (mirror),
`client/src/components/BookingWidget.jsx`.

---

## 4. GST tax invoice generation

**How it works**
- `GET /api/bookings/:id/invoice` is available to the guest, the host or an admin, and only for **confirmed**
  bookings.
- The first time an invoice is requested it gets a sequential number such as `STB/2026-27/00001`. The series
  restarts every **financial year** (April–March).
- Numbers come from an atomic counter (`Counter` model, `$inc` + upsert). A conditional update
  (`invoiceNumber: { $exists: false }`) prevents two concurrent requests from assigning two numbers.
- The invoice includes: seller details (from env), billed-to, property address with PIN, place of supply (the
  property's state), line items with **SAC 996311** (room accommodation), taxable value, CGST/SGST per line, totals
  and the amount in words.
- **Download PDF** uses the browser's print dialog with a print stylesheet that hides the app chrome, so no PDF
  library is needed.

**Files.** `server/src/controllers/invoiceController.js`, `server/src/models/Counter.js`,
`client/src/pages/Invoice.jsx`, print styles in `client/src/index.css`.

---

## 5. Host verification (KYC-lite)

**Flow:** `unverified → pending` (host submits) `→ verified | rejected` (an admin reviews; a rejected host can resubmit).

- Hosts submit their legal name, PAN, mobile number and the last 4 digits of their Aadhaar, and tick a consent box.
- Validation:
  - PAN must match `ABCDE1234F`.
  - The mobile number must be a valid Indian mobile; `+91`, `0` or spaced formats are normalised.
  - Exactly 4 Aadhaar digits are accepted.
- **Privacy by design:** the full PAN is never stored. Only a masked version (`ABXXX1234F`), the last 4 Aadhaar
  digits and a masked phone number are saved.
- Verified hosts get a ✓ **Verified host** badge on listing cards, the listing page and invoices.
- Business rule: **a listing can only be approved if its host is verified** (error code `HOST_NOT_VERIFIED`).

**Files.** `server/src/models/User.js` (`hostVerification`), `server/src/controllers/userController.js`
(`submitVerification`), `client/src/pages/host/HostVerification.jsx`, `client/src/components/Badges.jsx`.

---

## 6. Listing approval workflow

- New listings start as `pending` and are hidden from search, the wishlist and booking.
- Admins **approve** a listing, or **reject** it with a reason the host sees on their dashboard and edit form.
- **Material edits re-trigger review.** Changing the title, description, photos, type, address or location of an
  approved listing sends it back to `pending`. Price and amenity changes go live immediately. Editing a rejected
  listing resubmits it.
- The owner (and admins) can still preview an unapproved listing, which shows a status banner. Everyone else gets 404.
- Admins can also **unpublish** an approved listing.

**Files.** `server/src/models/Listing.js` (`status`, `MATERIAL_FIELDS`), `server/src/controllers/listingController.js`,
`server/src/controllers/adminController.js`, `client/src/pages/host/ListingForm.jsx`.

---

## 7. Custom admin dashboard (`/admin`)

An `admin` role (it can't be self-registered) unlocks a console with four tabs:

1. **Overview**
   - KPIs: listings awaiting review, hosts awaiting verification, user counts, gross booking value, GST collected,
     platform fee revenue.
   - A 6-month GBV chart and live listings by state.
2. **Listing approvals**
   - A queue (oldest first) with search and status filters.
   - Shows each host's verification status.
   - Approve, or reject/unpublish with suggested reasons.
3. **Host verification**
   - Shows the masked PAN, Aadhaar last 4 and masked phone.
   - Warns when the legal name differs from the profile name.
   - Verify, or reject with a reason.
4. **Users**
   - Search, role filter and pagination.
   - **Suspend** a user, with a reason. They are logged out on their next request with code `ACCOUNT_SUSPENDED`, and
     a suspended host's listings are unlisted.
   - **Reinstate** a suspended user.

**Files.** `server/src/controllers/adminController.js`, `server/src/routes/adminRoutes.js`,
`client/src/pages/admin/AdminDashboard.jsx`, `client/src/pages/admin/ReasonModal.jsx`.

---

## 8. Booking history filters (`/trips`)

`GET /api/bookings/me` accepts these parameters:
- `status`: all / upcoming / pending / completed / cancelled
- `q`: text search on the listing's title, city and state
- `from` / `to`: trips overlapping a date window
- `payment`: paid / unpaid / refunded / not_required
- `sort`: newest / oldest / price_high / price_low / booked_recent

The response includes **counts per status**, calculated after the other filters, so each chip shows its own total.
On the client, all filter state lives in the URL (`/trips?status=completed&q=coorg`), so it survives a refresh and can
be bookmarked. Text search is debounced by 350 ms. Each trip shows the GST it includes and has a 🧾 Invoice button.

**Files.** `server/src/controllers/bookingController.js` (`getMyBookings`), `client/src/pages/Trips.jsx`.

---

## 9. Custom validation & error messages

- **A tiny rule engine, with no dependencies** (`server/src/validation/validate.js`).
  - Rules: `required`, `minLength`, `matches`, `oneOf`, `number`, `isoDate`, `url` and `custom`.
  - Supports dotted paths (`address.pincode`) and a `partial` mode for updates.
  - `validateBody(schema)` middleware applies it to a route.
- **Schemas with human messages** (`server/src/validation/schemas.js`), for example:
  - *"PIN code must be 6 digits and can't start with 0 – e.g. 560038"*
  - *"PAN must be 10 characters like ABCDE1234F"*
  - *"Use at least 8 characters for your password"*
- **One error shape for every failure:** `{ message, code, errors? }`.
  - `code` is a stable identifier such as `VALIDATION_ERROR`, `DATES_UNAVAILABLE`, `HOST_NOT_VERIFIED` or
    `ACCOUNT_SUSPENDED` (`server/src/utils/ApiError.js`).
  - Mongoose, duplicate-key and JSON-parse errors are translated into the same shape.
- **Client side**
  - The same messages run instantly in the browser (`client/src/utils/validation.js`).
  - Server errors are mapped back onto fields with `fieldErrorsFrom()`.
  - Errors appear under each field, linked with `aria-invalid` / `aria-describedby`.
  - The first invalid field is focused, and a live password-strength checklist appears on sign-up.

---

## 10. Wishlist / favourites

- A heart button on every card and on the listing page.
- Saving and unsaving are **optimistic**: the UI updates at once and rolls back if the API fails.
- `$addToSet` / `$pull` on `user.wishlist` prevents duplicates. The `/wishlist` page only shows listings that are
  still approved and active.

---

## Testing

```bash
cd server
npm test        # Node's built-in test runner – 13 unit tests, no database needed
```

The tests cover the GST slabs, price breakdowns and CGST/SGST rounding, Indian number-to-words, the financial year,
₹ formatting, the register, listing and verification validation messages, PAN masking and mobile normalisation
(`server/test/*.test.js`).

## Demo walkthrough (about 5 minutes)

1. `npm run seed`. All accounts use the password `password123`.
2. **Guest** (`guest@demo.com`):
   - Search "Coorg", open the cottage and pick dates to see the 5 % GST breakdown.
   - Book it, then open **Trips**, filter by status and search, then click **🧾 Invoice** → *Download PDF*.
3. **New host** (`newhost@demo.com`): see the verification banner and the *pending* and *rejected* listings with the
   reviewer's note.
4. **Admin** (`admin@demo.com`):
   - Try to approve the Kudremukh treehouse. It's blocked with *"Verify the host first"*.
   - Verify Rohan in **Host verification**, then approve the listing. It now appears in search with a ✓ badge.
5. **Admin → Users:** suspend a guest. That guest is logged out with the suspension reason.

## New and changed API endpoints

| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/listings?state=Karnataka` | public |
| GET | `/api/bookings/me?status&q&from&to&payment&sort` | guest |
| GET | `/api/bookings/:id/invoice` | guest / host / admin |
| POST | `/api/users/me/verification` | host |
| GET | `/api/admin/stats` | admin |
| GET | `/api/admin/listings?status&q` | admin |
| PATCH | `/api/admin/listings/:id/approve` and `/reject` | admin |
| GET | `/api/admin/verifications?status` | admin |
| PATCH | `/api/admin/verifications/:userId/approve` and `/reject` | admin |
| GET | `/api/admin/users?q&role&page` | admin |
| PATCH | `/api/admin/users/:id/suspend` and `/unsuspend` | admin |

---

## Authorship & AI-assistance statement

> **Complete this section yourself, honestly, before you submit.** Many courses allow AI assistance as long as it
> is disclosed. Check your course's policy.

- **AI assistance:** Parts of this project's code and documentation were generated with the help of an AI assistant
  (Claude, by Anthropic). I reviewed, ran and tested the code, and I can explain how each feature works.
- **What I changed or built myself:** *(list your own contributions: features you modified, bugs you fixed,
  design choices you made, data you added, deployment you did)*
- **What I learned / would do differently:** *(2–3 sentences)*
