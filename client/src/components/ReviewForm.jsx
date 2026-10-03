import { useState } from 'react';
import { reviewsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import { StarInput } from './StarRating.jsx';

const HINTS = ['', 'Terrible', 'Poor', 'Okay', 'Great', 'Amazing'];

export default function ReviewForm({ bookingId, onDone, onCancel }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please choose a star rating');
    if (comment.trim().length < 20) return setError('Reviews need at least 20 characters to be helpful');
    setSubmitting(true);
    setError('');
    try {
      const { review } = await reviewsApi.create({ bookingId, rating, comment: comment.trim() });
      onDone(review);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit review'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit}>
      <div className="row gap">
        <StarInput value={rating} onChange={setRating} />
        <span className="muted">{HINTS[rating]}</span>
      </div>
      <label className="field">
        <span>Your review</span>
        <textarea
          rows={5}
          maxLength={1000}
          placeholder="Share what you liked, and anything future guests should know"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <small className="muted">{comment.length}/1000</small>
      </label>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="row gap modal-actions">
        <button type="button" className="btn btn-link" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post review'}
        </button>
      </div>
    </form>
  );
}
