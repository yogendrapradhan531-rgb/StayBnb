import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hostApi } from '../../api/services.js';
import { getErrorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import ColumnChart from '../../components/charts/ColumnChart.jsx';
import HBarList from '../../components/charts/HBarList.jsx';
import { formatMoney, formatMoneyCompact, plural } from '../../utils/format.js';

const RANGES = [3, 6, 12];

function Kpi({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <span className="muted small">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

/** Earnings & bookings over time, occupancy this month, top listings. */
export default function HostAnalytics() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    hostApi
      .analytics(months)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(getErrorMessage(err, 'Could not load analytics')));
    return () => { alive = false; };
  }, [months, reload]);

  if (error) return <ErrorBox message={error} onRetry={() => setReload((r) => r + 1)} />;
  if (!data) return <Spinner />;

  const { summary, monthly, occupancy, topListings } = data;
  const monthName = new Date(`${data.occupancyMonth}-01T00:00:00`).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const withFullLabel = (key, sub) =>
    monthly.map((m) => ({
      label: m.label,
      fullLabel: new Date(`${m.month}-01T00:00:00`).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      value: m[key],
      sub: sub(m),
    }));

  return (
    <div className="analytics">
      <div className="row space-between wrap analytics-head">
        <p className="muted">Based on confirmed bookings by check-in month.</p>
        <div className="segmented" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={months === r} onClick={() => { setData(null); setMonths(r); }}>
              {r} months
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <Kpi label="Earnings" value={formatMoney(summary.earnings)} hint={`last ${months} months`} />
        <Kpi label="Bookings" value={summary.bookings} hint={plural(summary.nights, 'night')} />
        <Kpi label="Avg. nightly rate" value={formatMoney(summary.avgNightlyRate)} hint="earned per booked night" />
        <Kpi label="Avg. stay" value={`${summary.avgStayLength || 0} nights`} />
        <Kpi label="Cancellation rate" value={`${summary.cancellationRate}%`} hint="of bookings made" />
      </div>

      <div className="chart-grid">
        <ChartCard
          title="Earnings"
          subtitle="Host payout per month (excl. guest service fees)"
          table={<MonthlyTable rows={monthly} />}
        >
          <ColumnChart
            ariaLabel={`Earnings per month for the last ${months} months`}
            data={withFullLabel('earnings', (m) => plural(m.bookings, 'booking'))}
            format={(v, axis) => (axis ? formatMoneyCompact(v) : formatMoney(v))}
          />
        </ChartCard>

        <ChartCard title="Nights booked" subtitle="Total nights across all listings" table={<MonthlyTable rows={monthly} />}>
          <ColumnChart
            ariaLabel={`Nights booked per month for the last ${months} months`}
            data={withFullLabel('nights', (m) => plural(m.bookings, 'booking'))}
            format={(v, axis) => (axis ? String(Math.round(v)) : plural(v, 'night'))}
          />
        </ChartCard>

        <ChartCard title="Occupancy" subtitle={`Share of nights booked in ${monthName}`}>
          <HBarList
            items={occupancy.map((o) => ({ key: o.listingId, label: o.title, value: o.rate, text: `${o.rate}%` }))}
            empty="No active listings yet."
          />
        </ChartCard>

        <ChartCard title="Top listings" subtitle={`By earnings, last ${months} months`}>
          {topListings.length === 0 ? (
            <p className="muted">No confirmed bookings in this period.</p>
          ) : (
            <ol className="top-list">
              {topListings.map((t, i) => (
                <li key={t._id}>
                  <span className="top-rank">{i + 1}</span>
                  <span className="top-title">
                    <Link to={`/listings/${t._id}`}>{t.title}</Link>
                    <span className="muted small">{t.city} · {plural(t.bookings, 'booking')}</span>
                  </span>
                  <strong>{formatMoney(t.earnings)}</strong>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function MonthlyTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Month</th><th>Bookings</th><th>Nights</th><th>Earnings</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td>{r.month}</td>
              <td>{r.bookings}</td>
              <td>{r.nights}</td>
              <td>{formatMoney(r.earnings)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
