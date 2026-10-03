import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { bookingsApi, hostApi, listingsApi } from '../../api/services.js';
import { getErrorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import SmartImage from '../../components/SmartImage.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Avatar from '../../components/Avatar.jsx';
import PaymentBadge from '../../components/PaymentBadge.jsx';
import { RatingBadge } from '../../components/StarRating.jsx';
import { CalendarIcon, ChartIcon } from '../../components/Icons.jsx';
import HostAnalytics from './HostAnalytics.jsx';
import HostVerification from './HostVerification.jsx';
import { ListingStatusBadge } from '../../components/Badges.jsx';
import { formatLocation, formatMoney, formatRange, fromISODate, plural } from '../../utils/format.js';

/** Role-based UI: guests see an upsell, hosts see the dashboard. */
export default function HostDashboard() {
  const { isHost } = useAuth();
  return isHost ? <Dashboard /> : <BecomeHost />;
}

function BecomeHost() {
  const { becomeHost } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const upgrade = async () => {
    setBusy(true);
    try {
      await becomeHost();
      toast.success('Welcome, host! Let’s create your first listing.');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="container page narrow">
      <div className="card become-host">
        <div className="become-host-icon" aria-hidden="true">🏡</div>
        <h1>Become a host</h1>
        <p className="muted">
          Share your space, earn extra income and welcome guests from around the world.
          Upgrading your account lets you create listings, manage your calendar and track earnings.
        </p>
        <ul className="benefits">
          <li>📈 Earnings & occupancy analytics</li>
          <li>📅 Calendar with blocked dates</li>
          <li>💳 Guests pay securely by card (Stripe)</li>
        </ul>
        <button type="button" className="btn btn-primary btn-lg" onClick={upgrade} disabled={busy}>
          {busy ? 'Setting things up…' : 'Switch to hosting'}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <span className="muted small">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

const TABS = [
  ['overview', 'Overview'],
  ['listings', 'Listings'],
  ['reservations', 'Reservations'],
];

function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => {
    hostApi.stats().then(({ stats: s }) => setStats(s)).catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(loadStats, [loadStats]);

  return (
    <div className="container page">
      <div className="page-header row space-between wrap">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="muted">Here’s what’s happening with your listings.</p>
        </div>
        <Link to="/host/listings/new" className="btn btn-primary">+ Create listing</Link>
      </div>

      <HostVerification />
      <ErrorBox message={error} onRetry={loadStats} />

      {stats ? (
        <div className="stats-grid">
          <StatCard label="Active listings" value={stats.activeListings} hint={`${stats.totalListings} total`} />
          <StatCard label="Upcoming reservations" value={stats.upcomingBookings} hint={`${stats.totalBookings} all-time`} />
          <StatCard label="Earnings this month" value={formatMoney(stats.monthEarnings)} hint="by check-in date" />
          <StatCard label="Total earnings" value={formatMoney(stats.totalEarnings)} hint="excl. guest service fees" />
          <StatCard
            label="Overall rating"
            value={stats.totalReviews ? `★ ${stats.avgRating.toFixed(2)}` : '—'}
            hint={plural(stats.totalReviews, 'review')}
          />
        </div>
      ) : (
        !error && <Spinner />
      )}

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>
            {key === 'overview' && <ChartIcon width={16} height={16} />} {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <HostAnalytics />}
      {tab === 'listings' && <HostListings onChange={loadStats} />}
      {tab === 'reservations' && <HostReservations onChange={loadStats} />}
    </div>
  );
}

function HostListings({ onChange }) {
  const toast = useToast();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    hostApi.listings().then(({ listings: l }) => setListings(l)).catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const toggleActive = async (l) => {
    try {
      await listingsApi.update(l._id, { isActive: !l.isActive });
      setListings((list) => list.map((x) => (x._id === l._id ? { ...x, isActive: !l.isActive } : x)));
      toast.success(l.isActive ? 'Listing hidden from search' : 'Listing is live again');
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async () => {
    const id = deleting._id;
    try {
      const res = await listingsApi.remove(id);
      toast.success(res.message);
      if (res.archived) setListings((list) => list.map((x) => (x._id === id ? { ...x, isActive: false } : x)));
      else setListings((list) => list.filter((x) => x._id !== id));
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  if (!listings) return error ? <ErrorBox message={error} onRetry={load} /> : <Spinner />;
  if (listings.length === 0) {
    return (
      <EmptyState
        icon="🏡"
        title="You don’t have any listings yet"
        message="Create your first listing to start welcoming guests."
        action={<Link to="/host/listings/new" className="btn btn-dark">Create listing</Link>}
      />
    );
  }

  return (
    <>
      <div className="host-list">
        {listings.map((l) => (
          <article key={l._id} className="card host-row">
            <div className="host-thumb">
              <SmartImage src={l.images[0]} alt={l.title} width={400} sizes="160px" />
            </div>
            <div className="host-info">
              <div className="row gap wrap">
                <h3><Link to={`/listings/${l._id}`}>{l.title}</Link></h3>
                <ListingStatusBadge status={l.status} />
                {!l.isActive && <span className="status status-cancelled">Unlisted</span>}
              </div>
              <p className="muted">{formatLocation(l.address)} · {formatMoney(l.pricePerNight)}/night</p>
              {l.status === 'rejected' && l.rejectionReason && (
                <p className="small rejection-note">Reviewer: {l.rejectionReason}</p>
              )}
              {l.status === 'pending' && <p className="small muted">Waiting for review – it’ll appear in search once approved.</p>}
              <p className="small">
                <RatingBadge rating={l.avgRating} count={l.reviewCount} /> · {plural(l.upcomingBookings, 'upcoming booking')}
              </p>
            </div>
            <div className="host-actions">
              <Link to={`/host/listings/${l._id}/calendar`} className="btn btn-outline">
                <CalendarIcon width={16} height={16} /> Calendar
              </Link>
              <Link to={`/host/listings/${l._id}/edit`} className="btn btn-outline">Edit</Link>
              <button type="button" className="btn btn-ghost" onClick={() => toggleActive(l)}>
                {l.isActive ? 'Unlist' : 'Relist'}
              </button>
              <button type="button" className="btn btn-ghost danger" onClick={() => setDeleting(l)}>Delete</button>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this listing?"
        danger
        confirmLabel="Delete"
        message={`“${deleting?.title}” will be removed. Listings with past bookings are archived instead so guests keep their trip history.`}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

const SCOPES = [['upcoming', 'Upcoming'], ['past', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']];

function HostReservations({ onChange }) {
  const toast = useToast();
  const [scope, setScope] = useState('upcoming');
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    setBookings(null);
    setError('');
    hostApi.bookings(scope).then(({ bookings: b }) => setBookings(b)).catch((err) => setError(getErrorMessage(err)));
  }, [scope]);

  const cancel = async () => {
    try {
      const { booking } = await bookingsApi.cancel(cancelling._id);
      setBookings((list) => list.map((b) => (b._id === booking._id ? { ...b, status: booking.status, paymentStatus: booking.paymentStatus } : b)));
      toast.success(booking.paymentStatus === 'refunded' ? 'Reservation cancelled and guest refunded' : 'Reservation cancelled');
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <div className="chips">
        {SCOPES.map(([key, label]) => (
          <button key={key} type="button" className={scope === key ? 'chip active' : 'chip'} onClick={() => setScope(key)}>
            {label}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />

      {!bookings ? (
        !error && <Spinner />
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" title="No reservations here" message="Reservations for your listings will show up in this list." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Listing</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Payment</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div className="row gap">
                      <Avatar user={b.guest} size={32} />
                      <div>
                        <strong>{b.guest?.name}</strong>
                        <div className="muted small">{b.guest?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{b.listing ? <Link to={`/listings/${b.listing._id}`}>{b.listing.title}</Link> : '—'}</td>
                  <td className="nowrap">{formatRange(b.checkIn, b.checkOut)}</td>
                  <td>{b.guests}</td>
                  <td className="nowrap">{formatMoney(b.pricePerNight * b.nights + (b.cleaningFee || 0))}</td>
                  <td><span className={`status status-${b.status}`}>{b.status}</span></td>
                  <td><PaymentBadge status={b.paymentStatus} /></td>
                  <td>
                    {b.status === 'confirmed' && fromISODate(b.checkIn) > today && (
                      <button type="button" className="btn btn-link danger" onClick={() => setCancelling(b)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this reservation?"
        danger
        confirmLabel="Cancel reservation"
        cancelLabel="Keep it"
        message={
          cancelling?.paymentStatus === 'paid'
            ? `${cancelling.guest?.name} will be refunded ${formatMoney(cancelling.totalPrice)} in full. Host cancellations hurt guest trust — only do this if you must.`
            : `${cancelling?.guest?.name || 'The guest'} will see this reservation as cancelled in their trips.`
        }
        onConfirm={cancel}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
