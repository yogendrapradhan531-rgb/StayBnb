import { useEffect, useState } from 'react';
import { listingsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import Spinner from './Spinner.jsx';
import { formatDate, plural } from '../utils/format.js';

/** Average + star breakdown + paginated list of reviews. */
export default function ReviewsSection({ listingId, avgRating, reviewCount }) {
  const [reviews, setReviews] = useState([]);
  const [breakdown, setBreakdown] = useState({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listingsApi
      .reviews(listingId, { page, limit: 6 })
      .then((data) => {
        if (!alive) return;
        setReviews((prev) => (page === 1 ? data.reviews : [...prev, ...data.reviews]));
        setBreakdown(data.breakdown);
        setPages(data.pages);
      })
      .catch((err) => alive && setError(getErrorMessage(err, 'Could not load reviews')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [listingId, page]);

  return (
    <section className="detail-section reviews">
      <h2>
        {reviewCount ? `★ ${Number(avgRating).toFixed(2)} · ${plural(reviewCount, 'review')}` : 'No reviews yet'}
      </h2>

      {reviewCount > 0 && (
        <div className="rating-breakdown">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = breakdown[star] || 0;
            const pct = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
            return (
              <div key={star} className="breakdown-row">
                <span>{star}</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                <span className="muted small">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="muted">{error}</p>}

      <div className="review-grid">
        {reviews.map((r) => (
          <article key={r._id} className="review">
            <div className="review-head">
              <span className="avatar">{r.author?.name?.charAt(0) || '?'}</span>
              <div>
                <strong>{r.author?.name || 'Guest'}</strong>
                <div className="muted small">{formatDate(r.createdAt, { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="stars" aria-label={`${r.rating} out of 5 stars`}>
              {'★'.repeat(r.rating)}<span className="muted">{'★'.repeat(5 - r.rating)}</span>
            </div>
            <p>{r.comment}</p>
          </article>
        ))}
      </div>

      {loading && <Spinner />}
      {!loading && page < pages && (
        <button type="button" className="btn btn-outline" onClick={() => setPage((p) => p + 1)}>
          Show more reviews
        </button>
      )}
    </section>
  );
}
