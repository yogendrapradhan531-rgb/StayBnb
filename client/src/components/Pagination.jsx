export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Prev
      </button>
      <span className="muted">Page {page} of {pages}</span>
      <button type="button" className="btn btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next ›
      </button>
    </nav>
  );
}
