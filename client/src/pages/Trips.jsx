import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SmartImage from '../components/SmartImage.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PaymentBadge from '../components/PaymentBadge.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import { formatLocation, formatMoney, formatRange, fromISODate, plural } from '../utils/format.js';

const STATUSES = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['pending', 'Awaiting payment'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];
const SORTS = [
  ['newest', 'Check-in: latest first'],
  ['oldest', 'Check-in: earliest first'],
  ['price_high', 'Price: high to low'],
  ['price_low', 'Price: low to high'],
  ['booked_recent', 'Recently booked'],
];
const PAYMENTS = [
  ['', 'Any payment status'],
  ['paid', 'Paid'],
  ['unpaid', 'Awaiting payment'],
  ['refunded', 'Refunded'],
  ['not_required', 'No payment needed'],
];
const FILTER_KEYS = ['status', 'q', 'from', 'to', 'payment', 'sort'];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Booking history with filters. All filter state lives in the URL
 * (/trips?status=completed&q=coorg&from=2026-01-01) so it survives refreshes
 * and can be bookmarked; filtering itself happens on the server.
 */
export default function Trips() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramString = searchParams.toString();
  const filters = useMemo(() => {
    const sp = new URLSearchParams(paramString);
    return Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) || '']));
  }, [paramString]);
  const status = filters.status || 'all';

  const [data, setData] = useState(null); // { bookings, counts, total }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(filters.q);
  const [reviewing, setReviewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);

  const setFilter = useCallback(
    (patch) => {
      const next = new URLSearchParams(paramString);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setSearchParams(next, { replace: true });
    },
    [paramString, setSearchParams]
  );

  // Debounce the text search so we don't hit the API on every keystroke
  useEffect(() => {
    if (searchText === filters.q) return undefined;
    const t = setTimeout(() => setFilter({ q: searchText.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchText, filters.q, setFilter]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    bookingsApi
      .mine(params)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your trips')))
      .finally(() => setLoading(false));
  }, [filters]);
  useEffect(load, [load]);

  const activeFilterCount = ['q', 'from', 'to', 'payment'].filter((k) => filters[k]).length;
  const clearFilters = () => {
    setSearchText('');
    setSearchParams(status !== 'all' ? { status } : {}, { replace: true });
  };

  const cancel = async () => {
    try {
      const { booking } = await bookingsApi.cancel(cancelling._id);
      toast.success(booking.paymentStatus === 'refunded' ? 'Booking cancelled – a full refund is on its way' : 'Booking cancelled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel'));
      throw err;
    }
  };

  const pay = async (b) => {
    setPaying(b._id);
    try {
      const res = await bookingsApi.pay(b._id);
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      toast.success('Payment confirmed');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      load();
    }
    setPaying(null);
  };

  const onReviewed = () => {
    toast.success('Thanks for your review!');
    setReviewing(null);
    load();
  };

  const bookings = data?.bookings || [];
  const counts = data?.counts || {};
  const today = startOfToday();

  return (
    <div className="container page">
      <div className="page-header row space-between wrap">
        <div>
          <h1>Trips</h1>
          {data && <p className="muted">{plural(data.total, 'booking')} in your history</p>}
        </div>
      </div>

      {/* ---------- filters ---------- */}
      <div className="history-filters card">
        <div className="chips" role="tablist" aria-label="Booking status">
          {STATUSES.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={status === key}
              className={status === key ? 'chip active' : 'chip'}
              onClick={() => setFilter({ status: key === 'all' ? '' : key })}>
              {label} {counts[key] !== undefined && <span className="chip-count">{counts[key]}</span>}
            </button>
          ))}
        </div>
        <div className="history-row">
          <label className="search-input">
            <SearchIcon width={16} height={16} />
            <input
              type="search"
              placeholder="Search by place, city or state"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Search trips"
            />
          </label>
          <label className="field inline">
            <span>From</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter({ from: e.target.value })} />
          </label>
          <label className="field inline">
            <span>To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter({ to: e.target.value })} />
          </label>
          <select aria-label="Payment status" value={filters.payment} onChange={(e) => setFilter({ payment: e.target.value })}>
            {PAYMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select aria-label="Sort trips" value={filters.sort || 'newest'} onChange={(e) => setFilter({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button type="button" className="btn btn-link" onClick={clearFilters}>Clear filters ({activeFilterCount})</button>
          )}
        </div>
      </div>

      <ErrorBox message={error} onRetry={load} />

      {loading && !data ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={activeFilterCount ? '🔍' : '🧳'}
          title={activeFilterCount ? 'No trips match these filters' : status === 'all' ? 'No trips booked… yet!' : `No ${STATUSES.find(([k]) => k === status)?.[1].toLowerCase()} trips`}
          message={activeFilterCount ? 'Try a different search term or date range.' : 'Time to dust off your bags and start planning your next adventure.'}
          action={activeFilterCount
            ? <button type="button" className="btn btn-dark" onClick={clearFilters}>Clear filters</button>
            : <Link to="/" className="btn btn-dark">Start searching</Link>}
        />
      ) : (
        <div className={loading ? 'trip-list is-loading' : 'trip-list'}>
          {bookings.map((b) => {
            const l = b.listing;
            const pending = b.status === 'pending';
            const canCancel = pending || (b.status === 'confirmed' && fromISODate(b.checkIn) > today);
            const canReview = b.isCompleted && !b.hasReviewed && l;
            return (
              <article key={b._id} className="card trip-card">
                <div className="trip-media">
                  <SmartImage src={l?.images?.[0]} alt={l?.title || 'Listing'} width={400} sizes="220px" />
                </div>
                <div className="trip-body">
                  <div className="row space-between wrap">
                    <h3>{l ? <Link to={`/listings/${l._id}`}>{l.title}</Link> : 'Listing removed'}</h3>
                    <div className="row gap">
                      <span className={`status status-${b.status}`}>{b.bucket === 'completed' ? 'completed' : pending ? 'payment pending' : b.status}</span>
                      {b.paymentStatus !== 'not_required' && <PaymentBadge status={b.paymentStatus} />}
                    </div>
                  </div>
                  {l && <p className="muted">{formatLocation(l.address)}</p>}
                  <p>
                    {formatRange(b.checkIn, b.checkOut)} · {plural(b.guests, 'guest')} · <strong>{formatMoney(b.totalPrice)}</strong>
                    {b.gst?.total > 0 && <span className="muted small"> incl. {formatMoney(b.gst.total)} GST</span>}
                  </p>

                  <div className="row gap wrap trip-actions">
                    {pending && (
                      <button type="button" className="btn btn-primary" onClick={() => pay(b)} disabled={paying === b._id}>
                        {paying === b._id ? 'Opening checkout…' : 'Complete payment'}
                      </button>
                    )}
                    <Link to={`/bookings/${b._id}`} className="btn btn-outline">Details</Link>
                    {b.status === 'confirmed' && (
                      <Link to={`/bookings/${b._id}/invoice`} className="btn btn-ghost">🧾 Invoice</Link>
                    )}
                    {canCancel && (
                      <button type="button" className="btn btn-ghost danger" onClick={() => setCancelling(b)}>
                        Cancel booking
                      </button>
                    )}
                    {canReview && (
                      <button type="button" className="btn btn-dark" onClick={() => setReviewing(b)}>
                        ★ Write a review
                      </button>
                    )}
                    {b.hasReviewed && <span className="muted small">✔ Reviewed</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title="Rate your stay" size="md">
        {reviewing && (
          <>
            <p className="muted">{reviewing.listing?.title} · {formatRange(reviewing.checkIn, reviewing.checkOut)}</p>
            <ReviewForm bookingId={reviewing._id} onDone={onReviewed} onCancel={() => setReviewing(null)} />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this trip?"
        danger
        confirmLabel="Yes, cancel"
        cancelLabel="Keep booking"
        message={
          cancelling?.paymentStatus === 'paid'
            ? `You’ll receive a full refund of ${formatMoney(cancelling.totalPrice)} to your original payment method.`
            : 'Your dates will be released for other guests.'
        }
        onConfirm={cancel}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
