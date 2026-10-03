export default function Spinner({ full = false, label = 'Loading…' }) {
  return (
    <div className={full ? 'spinner-wrap spinner-full' : 'spinner-wrap'} role="status" aria-live="polite">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
