import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/services.js';
import { getErrorCode, getErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import SmartImage from '../../components/SmartImage.jsx';
import Avatar from '../../components/Avatar.jsx';
import Pagination from '../../components/Pagination.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import ColumnChart from '../../components/charts/ColumnChart.jsx';
import HBarList from '../../components/charts/HBarList.jsx';
import { ListingStatusBadge, VerificationBadge } from '../../components/Badges.jsx';
import { SearchIcon } from '../../components/Icons.jsx';
import ReasonModal from './ReasonModal.jsx';
import { capitalize, formatDate, formatLocation, formatMoney, formatMoneyCompact, plural } from '../../utils/format.js';

const TABS = [
  ['overview', 'Overview'],
  ['listings', 'Listing approvals'],
  ['verifications', 'Host verification'],
  ['users', 'Users'],
];

/** Custom admin console: platform KPIs, moderation queues and user management. */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => {
    adminApi.stats().then(setStats).catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(loadStats, [loadStats]);

  const pendingListings = stats?.listings?.pending || 0;
  const pendingHosts = stats?.verifications?.pending || 0;

  return (
    <div className="container page">
      <div className="page-header">
        <span className="badge badge-brand">Admin</span>
        <h1>Admin console</h1>
        <p className="muted">Signed in as {user.name}. Approve listings, verify hosts and keep the community safe.</p>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            className={tab === key ? 'tab active' : 'tab'} onClick={() => setSearchParams({ tab: key }, { replace: true })}>
            {label}
            {key === 'listings' && pendingListings > 0 && <span className="count-badge">{pendingListings}</span>}
            {key === 'verifications' && pendingHosts > 0 && <span className="count-badge">{pendingHosts}</span>}
          </button>
        ))}
      </div>

      <ErrorBox message={error} onRetry={loadStats} />
      {tab === 'overview' && <Overview stats={stats} />}
      {tab === 'listings' && <ListingQueue onChange={loadStats} />}
      {tab === 'verifications' && <VerificationQueue onChange={loadStats} />}
      {tab === 'users' && <UserManager onChange={loadStats} />}
    </div>
  );
}

// ------------------------------------------------------------------ overview
function Kpi({ label, value, hint, to }) {
  const body = (
    <>
      <span className="muted small">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </>
  );
  return to ? <Link to={to} className="card stat-card link-card">{body}</Link> : <div className="card stat-card">{body}</div>;
}

function Overview({ stats }) {
  if (!stats) return <Spinner />;
  const u = stats.users;
  const maxState = Math.max(1, ...stats.topStates.map((s) => s.listings));
  return (
    <>
      <div className="stats-grid">
        <Kpi label="Listings awaiting review" value={stats.listings.pending || 0} hint={`${stats.listings.approved || 0} live`} to="/admin?tab=listings" />
        <Kpi label="Hosts awaiting verification" value={stats.verifications.pending || 0} hint={`${stats.verifications.verified || 0} verified`} to="/admin?tab=verifications" />
        <Kpi label="Users" value={(u.guest || 0) + (u.host || 0) + (u.admin || 0)} hint={`${u.guest || 0} guests · ${u.host || 0} hosts${u.suspended ? ` · ${u.suspended} suspended` : ''}`} to="/admin?tab=users" />
        <Kpi label="Gross booking value" value={formatMoney(stats.revenue.gbv)} hint={`${stats.bookings.confirmed || 0} confirmed bookings`} />
        <Kpi label="GST collected" value={formatMoney(stats.revenue.gst)} hint="CGST + SGST" />
        <Kpi label="Platform fee revenue" value={formatMoney(stats.revenue.platformFees)} hint="12% service fee" />
      </div>
      <div className="chart-grid">
        <ChartCard title="Gross booking value" subtitle="Confirmed bookings by check-in month (incl. GST)">
          <ColumnChart
            ariaLabel="Gross booking value per month, last 6 months"
            data={stats.monthly.map((m) => ({ label: m.label, fullLabel: m.month, value: m.gbv, sub: plural(m.bookings, 'booking') }))}
            format={(v, axis) => (axis ? formatMoneyCompact(v) : formatMoney(v))}
          />
        </ChartCard>
        <ChartCard title="Live listings by state" subtitle="Top states on the platform">
          <HBarList
            items={stats.topStates.map((s) => ({
              key: s.state,
              label: s.state,
              value: Math.round((s.listings / maxState) * 100),
              text: String(s.listings),
            }))}
          />
        </ChartCard>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ listing approvals
const LISTING_FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
const LISTING_REJECT_REASONS = [
  'Photos don’t show the actual property. Please upload real photos.',
  'The address or map pin doesn’t match the listing location.',
  'The description is too short or missing key details.',
];

function ListingQueue({ onChange }) {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setError('');
    adminApi.listings({ status, q: q || undefined }).then(({ listings: l }) => setListings(l)).catch((err) => setError(getErrorMessage(err)));
  }, [status, q]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const approve = async (l) => {
    setBusyId(l._id);
    try {
      const res = await adminApi.approveListing(l._id);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      if (getErrorCode(err) === 'HOST_NOT_VERIFIED') toast.info('Open the “Host verification” tab to review this host first.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (reason) => {
    try {
      const res = await adminApi.rejectListing(rejecting._id, reason);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="chips">
          {LISTING_FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={status === k ? 'chip active' : 'chip'} onClick={() => setStatus(k)}>{label}</button>
          ))}
        </div>
        <label className="search-input">
          <SearchIcon width={16} height={16} />
          <input type="search" placeholder="Search title, city or state" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search listings" />
        </label>
      </div>
      <ErrorBox message={error} onRetry={load} />

      {!listings ? (
        !error && <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState icon="✅" title={status === 'pending' ? 'All caught up!' : 'Nothing here'} message={status === 'pending' ? 'No listings are waiting for review.' : undefined} />
      ) : (
        <div className="host-list">
          {listings.map((l) => {
            const hostVerified = l.host?.hostVerification?.status === 'verified';
            return (
              <article key={l._id} className="card host-row admin-row">
                <div className="host-thumb">
                  <SmartImage src={l.images[0]} alt={l.title} width={400} sizes="160px" />
                </div>
                <div className="host-info">
                  <div className="row gap wrap">
                    <h3><Link to={`/listings/${l._id}`} target="_blank" rel="noreferrer">{l.title}</Link></h3>
                    <ListingStatusBadge status={l.status} />
                  </div>
                  <p className="muted">
                    {formatLocation(l.address)} – {l.address?.pincode} · {capitalize(l.propertyType)} · {formatMoney(l.pricePerNight)}/night · {plural(l.images.length, 'photo')}
                  </p>
                  <p className="small row gap wrap">
                    Host: <strong>{l.host?.name}</strong> <VerificationBadge status={l.host?.hostVerification?.status} />
                    <span className="muted">· submitted {formatDate(l.submittedAt)}</span>
                  </p>
                  {l.status === 'rejected' && <p className="small rejection-note">Reason: {l.rejectionReason}</p>}
                  {l.reviewedBy && l.status !== 'pending' && <p className="small muted">Reviewed by {l.reviewedBy.name} on {formatDate(l.reviewedAt)}</p>}
                </div>
                <div className="host-actions">
                  {l.status !== 'approved' && (
                    <button type="button" className="btn btn-primary" onClick={() => approve(l)} disabled={busyId === l._id}
                      title={hostVerified ? 'Publish this listing' : 'The host must be verified first'}>
                      {busyId === l._id ? 'Approving…' : 'Approve'}
                    </button>
                  )}
                  {l.status !== 'rejected' && (
                    <button type="button" className="btn btn-outline danger" onClick={() => setRejecting(l)}>
                      {l.status === 'approved' ? 'Unpublish' : 'Reject'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReasonModal
        open={Boolean(rejecting)}
        title={rejecting?.status === 'approved' ? 'Unpublish listing' : 'Reject listing'}
        intro={`“${rejecting?.title}” – the host will see this reason and can edit and resubmit.`}
        confirmLabel={rejecting?.status === 'approved' ? 'Unpublish' : 'Reject listing'}
        suggestions={LISTING_REJECT_REASONS}
        onSubmit={reject}
        onClose={() => setRejecting(null)}
      />
    </>
  );
}

// ------------------------------------------------------------------ host verification
const VERIFY_FILTERS = [['pending', 'Pending'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['all', 'All']];

function VerificationQueue({ onChange }) {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [hosts, setHosts] = useState(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(() => {
    setError('');
    adminApi.verifications(status).then(({ hosts: h }) => setHosts(h)).catch((err) => setError(getErrorMessage(err)));
  }, [status]);
  useEffect(load, [load]);

  const approve = async (h) => {
    try {
      const res = await adminApi.approveVerification(h._id);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const reject = async (reason) => {
    try {
      const res = await adminApi.rejectVerification(rejecting._id, reason);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <div className="chips admin-toolbar">
        {VERIFY_FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={status === k ? 'chip active' : 'chip'} onClick={() => setStatus(k)}>{label}</button>
        ))}
      </div>
      <ErrorBox message={error} onRetry={load} />
      {!hosts ? (
        !error && <Spinner />
      ) : hosts.length === 0 ? (
        <EmptyState icon="🪪" title={status === 'pending' ? 'No verifications waiting' : 'Nothing here'} />
      ) : (
        <div className="verify-grid">
          {hosts.map((h) => {
            const v = h.hostVerification || {};
            return (
              <article key={h._id} className="card verify-item">
                <div className="row gap">
                  <Avatar user={h} size={44} />
                  <div>
                    <strong>{h.name}</strong>
                    <div className="muted small">{h.email}</div>
                  </div>
                  <VerificationBadge status={v.status} />
                </div>
                <dl className="details-list">
                  <div><dt>Legal name</dt><dd>{v.legalName || '—'}</dd></div>
                  <div><dt>PAN</dt><dd><code>{v.panMasked || '—'}</code></dd></div>
                  <div><dt>Aadhaar</dt><dd>{v.aadhaarLast4 ? <code>XXXX XXXX {v.aadhaarLast4}</code> : '—'}</dd></div>
                  <div><dt>Mobile</dt><dd>{v.phoneMasked || '—'}</dd></div>
                  <div><dt>Submitted</dt><dd>{v.submittedAt ? formatDate(v.submittedAt) : '—'}</dd></div>
                  <div><dt>Listings</dt><dd>{h.listingCount}</dd></div>
                </dl>
                {v.legalName && v.legalName.toLowerCase() !== h.name.toLowerCase() && (
                  <p className="small warning-note">⚠ Legal name differs from the profile name – double-check.</p>
                )}
                {v.status === 'rejected' && <p className="small rejection-note">Reason: {v.rejectionReason}</p>}
                {v.status === 'pending' && (
                  <div className="row gap">
                    <button type="button" className="btn btn-primary" onClick={() => approve(h)}>Verify host</button>
                    <button type="button" className="btn btn-outline danger" onClick={() => setRejecting(h)}>Reject</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <ReasonModal
        open={Boolean(rejecting)}
        title="Reject verification"
        intro={`${rejecting?.name} will see this reason and can resubmit.`}
        confirmLabel="Reject"
        suggestions={['The name doesn’t match the PAN details provided.', 'The PAN number appears to be invalid. Please re-enter it.']}
        onSubmit={reject}
        onClose={() => setRejecting(null)}
      />
    </>
  );
}

// ------------------------------------------------------------------ users
function UserManager({ onChange }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [suspending, setSuspending] = useState(null);

  const load = useCallback(() => {
    setError('');
    adminApi
      .users({ q: q || undefined, role: role || undefined, page })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, [q, role, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const suspend = async (reason) => {
    try {
      const res = await adminApi.suspend(suspending._id, reason);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };
  const unsuspend = async (u) => {
    try {
      const res = await adminApi.unsuspend(u._id);
      toast.success(res.message);
      load();
      onChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <label className="search-input">
          <SearchIcon width={16} height={16} />
          <input type="search" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search users" />
        </label>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role" className="select-pill">
          <option value="">All roles</option>
          <option value="guest">Guests</option>
          <option value="host">Hosts</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <ErrorBox message={error} onRetry={load} />
      {!data ? (
        !error && <Spinner />
      ) : data.users.length === 0 ? (
        <EmptyState icon="👥" title="No users match" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Verification</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="row gap">
                        <Avatar user={u} size={32} />
                        <div><strong>{u.name}</strong><div className="muted small">{u.email}</div></div>
                      </div>
                    </td>
                    <td>{capitalize(u.role)}</td>
                    <td>{u.role === 'host' ? <VerificationBadge status={u.hostVerification?.status} /> : <span className="muted">—</span>}</td>
                    <td className="nowrap">{formatDate(u.createdAt)}</td>
                    <td>
                      {u.isSuspended
                        ? <span className="status status-rejected" title={u.suspendedReason}>Suspended</span>
                        : <span className="status status-confirmed">Active</span>}
                    </td>
                    <td>
                      {u.role !== 'admin' && (u.isSuspended
                        ? <button type="button" className="btn btn-link" onClick={() => unsuspend(u)}>Reinstate</button>
                        : <button type="button" className="btn btn-link danger" onClick={() => setSuspending(u)}>Suspend</button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
      <ReasonModal
        open={Boolean(suspending)}
        title={`Suspend ${suspending?.name}?`}
        intro={suspending?.role === 'host'
          ? 'They will be logged out and can’t sign in. All of their listings will be unlisted.'
          : 'They will be logged out and can’t sign in until you reinstate them.'}
        confirmLabel="Suspend"
        suggestions={['Repeated cancellations without notice.', 'Reported for violating community guidelines.']}
        onSubmit={suspend}
        onClose={() => setSuspending(null)}
      />
    </>
  );
}
