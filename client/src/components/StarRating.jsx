/** Read-only rating badge: ★ 4.82 (12) */
export function RatingBadge({ rating, count, showCount = true }) {
  if (!count) return <span className="rating new">★ New</span>;
  return (
    <span className="rating">
      ★ {Number(rating).toFixed(2)}
      {showCount && <span className="muted"> ({count})</span>}
    </span>
  );
}

/** Clickable 1–5 star input. */
export function StarInput({ value, onChange }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'star active' : 'star'}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
