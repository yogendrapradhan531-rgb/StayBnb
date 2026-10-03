import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { hostApi } from '../../api/services.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Avatar from '../../components/Avatar.jsx';
import PaymentBadge from '../../components/PaymentBadge.jsx';
import { ChevronLeft, ChevronRight } from '../../components/Icons.jsx';
import { formatDate, formatMoney, formatRange, fromISODate, plural, toISODate } from '../../utils/format.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** 6-week grid (Mon-first) covering the given month. */
function buildGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Host availability calendar for one listing.
 *  - booked nights show the guest; pending (unpaid) ones are marked
 *  - blocked nights are hatched; click one to unblock
 *  - click two free days to select a range and block it
 */
export default function ListingCalendar() {
  const { id } = useParams();
  const toast = useToast();
  const [month, setMonth] = useState(() => {
    const t = startOfToday();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({ start: null, end: null });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [unblocking, setUnblocking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const grid = useMemo(() => buildGrid(month), [month]);
  const today = startOfToday();

  const load = useCallback(async () => {
    setError('');
    try {
      const from = toISODate(grid[0]);
      const to = toISODate(addDays(grid[grid.length - 1], 1));
      setData(await hostApi.calendar(id, from, to));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load calendar'));
    }
  }, [id, grid]);

  useEffect(() => {
    load();
  }, [load]);

  // Map every day to what occupies it
  const dayInfo = useMemo(() => {
    const map = {};
    if (!data) return map;
    for (const b of data.bookings) {
      const start = fromISODate(b.checkIn);
      const end = fromISODate(b.checkOut);
      for (let d = start; d < end; d = addDays(d, 1)) {
        map[toISODate(d)] = { type: 'booking', item: b, isStart: d.getTime() === start.getTime() };
      }
    }
    for (const bl of data.blocks) {
      const start = fromISODate(bl.start);
      const end = fromISODate(bl.end);
      for (let d = start; d < end; d = addDays(d, 1)) {
        map[toISODate(d)] = { type: 'block', item: bl, isStart: d.getTime() === start.getTime() };
      }
    }
    return map;
  }, [data]);

  const isFree = (d) => d >= today && !dayInfo[toISODate(d)];
  const rangeFree = (a, b) => {
    for (let d = a; d <= b; d = addDays(d, 1)) if (!isFree(d)) return false;
    return true;
  };

  const onDayClick = (d) => {
    const info = dayInfo[toISODate(d)];
    if (info?.type === 'block') {
      setUnblocking(info.item);
      return;
    }
    if (info?.type === 'booking') {
      setSelectedBooking(info.item);
      return;
    }
    if (d < today) return;

    const { start, end } = selection;
    if (!start || end || d < start) {
      setSelection({ start: d, end: null });
    } else if (rangeFree(start, d)) {
      setSelection({ start, end: d });
    } else {
      toast.error('That range includes booked or blocked nights.');
      setSelection({ start: d, end: null });
    }
  };

  const inSelection = (d) => {
    const { start, end } = selection;
    if (!start) return false;
    if (!end) return d.getTime() === start.getTime();
    return d >= start && d <= end;
  };

  const block = async () => {
    const { start } = selection;
    const end = selection.end || selection.start; // a single click blocks one night
    setSaving(true);
    try {
      await hostApi.block(id, { start: toISODate(start), end: toISODate(addDays(end, 1)), note });
      toast.success(`Blocked ${plural(Math.round((addDays(end, 1) - start) / 86400000), 'night')}`);
      setSelection({ start: null, end: null });
      setNote('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not block dates'));
    } finally {
      setSaving(false);
    }
  };

  const unblock = async () => {
    try {
      await hostApi.unblock(id, unblocking._id);
      toast.success('Dates unblocked');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  const changeMonth = (delta) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedBooking(null);
  };

  if (error && !data) return <div className="container page"><ErrorBox message={error} onRetry={load} /></div>;
  if (!data) return <Spinner full />;

  const monthLabel = month.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const selNights = selection.start
    ? Math.round((addDays(selection.end || selection.start, 1) - selection.start) / 86400000)
    : 0;
  const monthBookings = data.bookings.filter((b) => {
    const s = fromISODate(b.checkIn);
    const e = fromISODate(b.checkOut);
    return s < new Date(month.getFullYear(), month.getMonth() + 1, 1) && e > month;
  });

  return (
    <div className="container page">
      <Link to="/host" className="muted back-link">‹ Back to dashboard</Link>
      <div className="page-header row space-between wrap">
        <div>
          <h1>Calendar</h1>
          <p className="muted">{data.listing.title}</p>
        </div>
        <Link to={`/host/listings/${id}/edit`} className="btn btn-outline">Edit listing</Link>
      </div>

      <div className="calendar-layout">
        <section className="card calendar-card">
          <header className="calendar-head">
            <button type="button" className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </button>
            <h2>{monthLabel}</h2>
            <button type="button" className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight />
            </button>
          </header>

          <div className="cal-grid" role="grid" aria-label={monthLabel}>
            {WEEKDAYS.map((w) => <div key={w} className="cal-weekday" role="columnheader">{w}</div>)}
            {grid.map((d, i) => {
              const key = toISODate(d);
              const info = dayInfo[key];
              const outside = d.getMonth() !== month.getMonth();
              const past = d < today;
              const classes = [
                'cal-day',
                outside && 'outside',
                past && 'past',
                d.getTime() === today.getTime() && 'today',
                info?.type === 'booking' && (info.item.status === 'pending' ? 'booked pending' : 'booked'),
                info?.type === 'block' && 'blocked',
                inSelection(d) && 'selected',
              ].filter(Boolean).join(' ');
              const isRowStart = i % 7 === 0;
              const showLabel = info && (info.isStart || isRowStart);

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  className={classes}
                  onClick={() => onDayClick(d)}
                  disabled={past && !info}
                  aria-label={`${formatDate(d)}${info?.type === 'booking' ? `, booked by ${info.item.guest?.name}` : ''}${info?.type === 'block' ? ', blocked' : ''}`}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  {showLabel && info.type === 'booking' && (
                    <span className="cal-tag">{info.item.guest?.name?.split(' ')[0] || 'Guest'}</span>
                  )}
                  {showLabel && info.type === 'block' && <span className="cal-tag">{info.item.note || 'Blocked'}</span>}
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span><i className="lg lg-booked" /> Booked</span>
            <span><i className="lg lg-pending" /> Awaiting payment</span>
            <span><i className="lg lg-blocked" /> Blocked by you</span>
            <span><i className="lg lg-selected" /> Selected</span>
          </div>
        </section>

        <aside className="calendar-side">
          {selection.start ? (
            <div className="card side-card">
              <h3>Block dates</h3>
              <p>
                <strong>
                  {formatDate(selection.start, { day: 'numeric', month: 'short' })}
                  {selection.end && selection.end > selection.start ? ` – ${formatDate(selection.end, { day: 'numeric', month: 'short' })}` : ''}
                </strong>{' '}
                <span className="muted">· {plural(selNights, 'night')}</span>
              </p>
              {!selection.end && <p className="muted small">Click another day to extend the range.</p>}
              <label className="field">
                <span>Note (only you see this)</span>
                <input value={note} maxLength={120} placeholder="e.g. Personal use, maintenance" onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="row gap">
                <button type="button" className="btn btn-dark" onClick={block} disabled={saving}>
                  {saving ? 'Blocking…' : 'Block nights'}
                </button>
                <button type="button" className="btn btn-link" onClick={() => setSelection({ start: null, end: null })}>Clear</button>
              </div>
            </div>
          ) : selectedBooking ? (
            <div className="card side-card">
              <div className="row space-between">
                <h3>Reservation</h3>
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedBooking(null)}>✕</button>
              </div>
              <div className="row gap">
                <Avatar user={selectedBooking.guest} size={44} />
                <div>
                  <strong>{selectedBooking.guest?.name}</strong>
                  <div className="muted small">{selectedBooking.guest?.email}</div>
                </div>
              </div>
              <dl className="details-list single">
                <div><dt>Dates</dt><dd>{formatRange(selectedBooking.checkIn, selectedBooking.checkOut)}</dd></div>
                <div><dt>Guests</dt><dd>{selectedBooking.guests}</dd></div>
                <div><dt>Guest paid</dt><dd>{formatMoney(selectedBooking.totalPrice)}</dd></div>
                <div><dt>Payment</dt><dd><PaymentBadge status={selectedBooking.paymentStatus} /></dd></div>
              </dl>
            </div>
          ) : (
            <div className="card side-card">
              <h3>How it works</h3>
              <p className="muted small">Click a free day, then another, to select nights you want to block. Click a blocked day to unblock it, or a booked day to see the reservation.</p>
            </div>
          )}

          <div className="card side-card">
            <h3>{monthLabel.split(' ')[0]} reservations</h3>
            {monthBookings.length === 0 ? (
              <p className="muted small">No reservations this month.</p>
            ) : (
              <ul className="mini-list">
                {monthBookings.map((b) => (
                  <li key={b._id}>
                    <button type="button" className="mini-item" onClick={() => setSelectedBooking(b)}>
                      <Avatar user={b.guest} size={32} />
                      <span>
                        <strong>{b.guest?.name}</strong>
                        <span className="muted small">{formatRange(b.checkIn, b.checkOut)} · {plural(b.nights, 'night')}</span>
                      </span>
                      {b.status === 'pending' && <span className="pay-badge pay-unpaid">Pending</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(unblocking)}
        title="Unblock these dates?"
        confirmLabel="Unblock"
        message={
          unblocking
            ? `${formatRange(unblocking.start, toISODate(addDays(fromISODate(unblocking.end), -1)))}${unblocking.note ? ` · “${unblocking.note}”` : ''} will become available to guests again.`
            : ''
        }
        onConfirm={unblock}
        onClose={() => setUnblocking(null)}
      />
    </div>
  );
}
