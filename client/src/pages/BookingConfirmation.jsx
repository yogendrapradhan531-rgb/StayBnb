import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { bookingsApi, paymentsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import SmartImage from '../components/SmartImage.jsx';
import PaymentBadge from '../components/PaymentBadge.jsx';
import { formatDate, formatLocation, formatMoney, formatMoneyExact, plural } from '../utils/format.js';

export default function BookingConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const started = useRef(null);

  useEffect(() => {
    if (started.current === id) return; // StrictMode runs effects twice in dev
    started.current = id;
    const sessionId = searchParams.get('session_id');

    // Returning from Stripe → ask the API to verify the payment with Stripe
    const load = sessionId
      ? paymentsApi.confirm(sessionId).then((res) => {
          if (res.booking.paymentStatus === 'paid') {
            setJustPaid(true);
            toast.success('Payment received – your booking is confirmed!');
          }
          setSearchParams({}, { replace: true });
          return res;
        })
      : bookingsApi.get(id);

    load
      .then(({ booking: b }) => setBooking(b))
      .catch((err) => setError(getErrorMessage(err, 'Could not load booking')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const completePayment = async () => {
    setPaying(true);
    try {
      const res = await bookingsApi.pay(booking._id);
      if (res.checkoutUrl) window.location.assign(res.checkoutUrl);
      else {
        setBooking(res.booking);
        setPaying(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPaying(false);
      bookingsApi.get(id).then(({ booking: b }) => setBooking(b)).catch(() => {});
    }
  };

  if (error) return <div className="container page"><ErrorBox message={error} /></div>;
  if (!booking) return <Spinner full label="Confirming your booking…" />;

  const { listing } = booking;
  const cancelled = booking.status === 'cancelled';
  const pending = booking.status === 'pending';
  const celebrate = (state?.justBooked || justPaid) && booking.status === 'confirmed';

  return (
    <div className="container page narrow">
      {celebrate && (
        <div className="success-banner" role="status">
          <span className="success-icon" aria-hidden="true">✓</span>
          <div>
            <strong>You’re going to {listing?.address?.city || 'your stay'}!</strong>
            <p className="muted small">Your reservation is confirmed. Details are below and in your trips.</p>
          </div>
        </div>
      )}
      {pending && (
        <div className="alert alert-warning" role="status">
          <span>Payment not completed yet. Your dates are held until {new Date(booking.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span>
          <button type="button" className="btn btn-dark" onClick={completePayment} disabled={paying}>
            {paying ? 'Opening checkout…' : 'Complete payment'}
          </button>
        </div>
      )}

      <h1>{cancelled ? 'Booking cancelled' : pending ? 'Almost there' : 'Your trip'}</h1>

      <div className="card confirm-card">
        {listing && (
          <div className="confirm-media">
            <SmartImage src={listing.images?.[0]} alt={listing.title} width={720} eager />
          </div>
        )}
        <div className="confirm-body">
          <h2>{listing?.title || 'Listing no longer available'}</h2>
          {listing && <p className="muted">{formatLocation(listing.address)}</p>}

          <dl className="details-list">
            <div><dt>Check-in</dt><dd>{formatDate(booking.checkIn)}</dd></div>
            <div><dt>Check-out</dt><dd>{formatDate(booking.checkOut)}</dd></div>
            <div><dt>Guests</dt><dd>{plural(booking.guests, 'guest')}</dd></div>
            <div><dt>Nights</dt><dd>{booking.nights}</dd></div>
            <div><dt>Status</dt><dd><span className={`status status-${booking.status}`}>{booking.status}</span></dd></div>
            <div><dt>Payment</dt><dd><PaymentBadge status={booking.paymentStatus} /></dd></div>
            <div><dt>Confirmation code</dt><dd><code>{booking._id.slice(-8).toUpperCase()}</code></dd></div>
          </dl>

          <div className="price-breakdown">
            <div className="row space-between">
              <span>{formatMoney(booking.pricePerNight)} × {plural(booking.nights, 'night')}</span>
              <span>{formatMoney(booking.pricePerNight * booking.nights)}</span>
            </div>
            {booking.cleaningFee > 0 && (
              <div className="row space-between"><span>Cleaning fee</span><span>{formatMoney(booking.cleaningFee)}</span></div>
            )}
            <div className="row space-between"><span>Service fee</span><span>{formatMoney(booking.serviceFee)}</span></div>
            {booking.gst?.total > 0 && (
              <>
                <div className="row space-between">
                  <span>CGST <span className="muted small">(stay {booking.gst.accommodationRate / 2}% · fee 9%)</span></span>
                  <span>{formatMoneyExact(booking.gst.cgst)}</span>
                </div>
                <div className="row space-between">
                  <span>SGST <span className="muted small">(stay {booking.gst.accommodationRate / 2}% · fee 9%)</span></span>
                  <span>{formatMoneyExact(booking.gst.sgst)}</span>
                </div>
              </>
            )}
            <hr />
            <div className="row space-between total">
              <span>{booking.paymentStatus === 'paid' ? 'Paid' : 'Total'}</span>
              <span>{formatMoneyExact(booking.totalPrice)}</span>
            </div>
          </div>

          <div className="row gap wrap">
            {booking.status === 'confirmed' && (
              <Link to={`/bookings/${booking._id}/invoice`} className="btn btn-primary">🧾 GST invoice</Link>
            )}
            <Link to="/trips" className="btn btn-dark">View all trips</Link>
            {listing && <Link to={`/listings/${listing._id}`} className="btn btn-outline">View listing</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
