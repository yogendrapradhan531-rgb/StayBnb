import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { bookingsApi, listingsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfig } from '../utils/useConfig.js';
import { RatingBadge } from './StarRating.jsx';
import { LockIcon } from './Icons.jsx';
import {
  calculatePrice, formatMoney, formatMoneyExact, fromISODate, gstRateFor, nightsBetween, plural, toISODate,
} from '../utils/format.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Booking flow (frontend half):
 *  1. Load booked ranges for this listing and grey them out in the calendar.
 *  2. While picking a check-out, only allow dates that keep the whole range free.
 *  3. Preview the price (server recalculates the real total).
 *  4. POST /bookings – if someone else booked first we get 409, refresh
 *     availability and ask the guest to choose again.
 *  5. With Stripe enabled the API returns a checkoutUrl and we redirect to
 *     Stripe's hosted payment page; Stripe sends the guest back afterwards.
 */
export default function BookingWidget({ listing, initial = {} }) {
  const { user } = useAuth();
  const toast = useToast();
  const { paymentsEnabled, gstEnabled } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [booked, setBooked] = useState([]); // [{ start: Date, end: Date }] end exclusive
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [guests, setGuests] = useState(Math.min(Number(initial.guests) || 1, listing.maxGuests));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = user && String(listing.host?._id || listing.host) === String(user._id);

  const loadAvailability = useCallback(async () => {
    try {
      const { booked: ranges } = await listingsApi.availability(listing._id);
      const parsed = ranges.map((r) => ({ start: fromISODate(r.checkIn), end: fromISODate(r.checkOut) }));
      setBooked(parsed);
      return parsed;
    } catch {
      setBooked([]);
      return [];
    }
  }, [listing._id]);

  const rangeIsFree = useCallback(
    (start, end, ranges = booked) => !ranges.some((b) => start < b.end && end > b.start),
    [booked]
  );
  const nightIsBooked = useCallback(
    (date) => booked.some((b) => date >= b.start && date < b.end),
    [booked]
  );

  // Load availability, then apply dates passed from the search page if still free
  useEffect(() => {
    let alive = true;
    loadAvailability().then((ranges) => {
      if (!alive) return;
      const s = fromISODate(initial.checkIn);
      const e = fromISODate(initial.checkOut);
      if (s && e && e > s && s >= startOfToday() && rangeIsFree(s, e, ranges)) {
        setStartDate(s);
        setEndDate(e);
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAvailability]);

  // Decides which calendar days are clickable
  const filterDate = (date) => {
    if (date < startOfToday()) return false;
    const pickingCheckout = startDate && !endDate && date > startDate;
    if (pickingCheckout) return rangeIsFree(startDate, date);
    return !nightIsBooked(date);
  };

  const onDatesChange = ([s, e]) => {
    setError('');
    if (s && e && !rangeIsFree(s, e)) {
      setError('Some nights in that range are already booked.');
      setStartDate(s);
      setEndDate(null);
      return;
    }
    setStartDate(s);
    setEndDate(e);
  };

  const nights = nightsBetween(startDate, endDate);
  const price = useMemo(
    () => (nights > 0 ? calculatePrice(listing, nights, { gstEnabled }) : null),
    [listing, nights, gstEnabled]
  );
  const slabRate = gstEnabled ? gstRateFor(listing.pricePerNight) : 0;

  const reserve = async () => {
    setError('');
    if (!startDate || !endDate || nights < 1) {
      setError('Select your check-in and check-out dates.');
      return;
    }
    if (!user) {
      // Come back to this page with the selection intact after logging in
      const sp = new URLSearchParams({ checkIn: toISODate(startDate), checkOut: toISODate(endDate), guests: String(guests) });
      navigate('/login', { state: { from: { pathname: location.pathname, search: `?${sp}` } } });
      return;
    }
    setSubmitting(true);
    try {
      const { booking, checkoutUrl } = await bookingsApi.create({
        listingId: listing._id,
        checkIn: toISODate(startDate),
        checkOut: toISODate(endDate),
        guests,
      });
      if (checkoutUrl) {
        toast.info('Dates held for 30 minutes – redirecting to secure checkout…');
        window.location.assign(checkoutUrl);
        return; // keep the button disabled while the browser navigates away
      }
      toast.success('Booking confirmed!');
      navigate(`/bookings/${booking._id}`, { state: { justBooked: true } });
    } catch (err) {
      const message = getErrorMessage(err, 'Booking failed');
      setError(message);
      toast.error(message);
      if (err.response?.status === 409) {
        await loadAvailability();
        setStartDate(null);
        setEndDate(null);
      }
      setSubmitting(false);
    }
  };

  if (isOwner) {
    return (
      <div className="card booking-widget">
        <p><strong>This is your listing.</strong></p>
        <p className="muted">Guests will see a booking panel here.</p>
        <Link className="btn btn-dark btn-block" to={`/host/listings/${listing._id}/edit`}>Edit listing</Link>
      </div>
    );
  }

  if (!listing.isActive || (listing.status && listing.status !== 'approved')) {
    return (
      <div className="card booking-widget">
        <p><strong>Not available</strong></p>
        <p className="muted">This place isn’t accepting bookings right now.</p>
      </div>
    );
  }

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  return (
    <div className="card booking-widget">
      <div className="row space-between">
        <p className="price-line">
          <strong>{formatMoney(listing.pricePerNight)}</strong> <span className="muted">night</span>
        </p>
        <RatingBadge rating={listing.avgRating} count={listing.reviewCount} />
      </div>

      <div className="booking-inputs">
        <label className="field">
          <span>Dates</span>
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={onDatesChange}
            filterDate={filterDate}
            minDate={startOfToday()}
            maxDate={maxDate}
            monthsShown={window.innerWidth > 720 ? 2 : 1}
            dateFormat="d MMM yyyy"
            placeholderText="Check in – Check out"
            isClearable
            shouldCloseOnSelect
          />
        </label>
        <label className="field">
          <span>Guests</span>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: listing.maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{plural(n, 'guest')}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={reserve} disabled={submitting}>
        {submitting
          ? paymentsEnabled ? 'Starting checkout…' : 'Reserving…'
          : !user ? 'Log in to reserve' : paymentsEnabled ? 'Reserve & pay' : 'Reserve'}
      </button>
      <p className="muted small center payment-note">
        {paymentsEnabled ? (
          <><LockIcon width={13} height={13} /> Secure payment by Stripe (test mode – use card 4242 4242 4242 4242)</>
        ) : (
          'You won’t be charged – this is a demo.'
        )}
      </p>

      {price && (
        <div className="price-breakdown">
          <div className="row space-between">
            <span>{formatMoney(listing.pricePerNight)} × {plural(nights, 'night')}</span>
            <span>{formatMoney(price.subtotal)}</span>
          </div>
          {price.cleaningFee > 0 && (
            <div className="row space-between"><span>Cleaning fee</span><span>{formatMoney(price.cleaningFee)}</span></div>
          )}
          <div className="row space-between"><span>Service fee</span><span>{formatMoney(price.serviceFee)}</span></div>
          {gstEnabled && (
            <details className="gst-details">
              <summary className="row space-between">
                <span>GST <span className="muted small">(incl. CGST + SGST)</span></span>
                <span>{formatMoneyExact(price.gst)}</span>
              </summary>
              <div className="gst-lines">
                <div className="row space-between">
                  <span>Stay @ {price.accommodationRate}%{price.accommodationRate === 0 ? ' (exempt ≤ ₹1,000/night)' : ''}</span>
                  <span>{formatMoneyExact(price.accommodationGst)}</span>
                </div>
                <div className="row space-between">
                  <span>Service fee @ 18%</span>
                  <span>{formatMoneyExact(price.serviceFeeGst)}</span>
                </div>
                <div className="row space-between muted">
                  <span>CGST / SGST</span>
                  <span>{formatMoneyExact(price.gst / 2)} each</span>
                </div>
              </div>
            </details>
          )}
          <hr />
          <div className="row space-between total"><span>Total (incl. taxes)</span><span>{formatMoneyExact(price.total)}</span></div>
        </div>
      )}
      {!price && gstEnabled && (
        <p className="muted small gst-hint">
          {slabRate === 0
            ? 'No GST on this stay – tariffs up to ₹1,000/night are exempt.'
            : `GST on this stay: ${slabRate}% (${slabRate === 5 ? 'tariff ₹1,001–₹7,500' : 'tariff above ₹7,500'}/night) + 18% on the service fee.`}
        </p>
      )}
    </div>
  );
}
