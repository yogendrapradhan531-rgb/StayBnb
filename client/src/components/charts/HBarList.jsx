/**
 * Horizontal magnitude bars as an HTML list (one hue, value as text at the tip).
 * items: [{ key, label, value (0–100), text }]
 */
export default function HBarList({ items, empty = 'No data yet' }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="hbar-list">
      {items.map((it) => (
        <li key={it.key} className="hbar-row">
          <span className="hbar-label" title={it.label}>{it.label}</span>
          <span className="hbar-track" aria-hidden="true">
            <span className="hbar-fill" style={{ width: `${Math.max(0, Math.min(100, it.value))}%` }} />
          </span>
          <span className="hbar-value">{it.text ?? `${it.value}%`}</span>
        </li>
      ))}
    </ul>
  );
}
