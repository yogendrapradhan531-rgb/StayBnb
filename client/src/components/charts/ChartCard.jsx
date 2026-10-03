import { useState } from 'react';

/**
 * Card wrapper for a chart with a "Chart / Table" switch so the data is
 * always available as text (accessibility + exact numbers).
 */
export default function ChartCard({ title, subtitle, children, table }) {
  const [view, setView] = useState('chart');
  return (
    <section className="card chart-card">
      <header className="chart-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {table && (
          <div className="segmented" role="group" aria-label="View as">
            <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
          </div>
        )}
      </header>
      {view === 'chart' || !table ? children : table}
    </section>
  );
}
