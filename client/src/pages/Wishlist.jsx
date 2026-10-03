import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import { plural } from '../utils/format.js';

export default function Wishlist() {
  const { wishlist } = useAuth();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    usersApi
      .wishlist()
      .then(({ listings: l }) => setListings(l))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your wishlist')));
  };
  useEffect(load, []);

  // Un-hearting a card removes it from this page immediately
  const visible = useMemo(
    () => (listings || []).filter((l) => wishlist.has(String(l._id))),
    [listings, wishlist]
  );

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Wishlist</h1>
        {listings && <p className="muted">{plural(visible.length, 'saved stay')}</p>}
      </div>
      <ErrorBox message={error} onRetry={load} />

      {!listings && !error ? (
        <div className="grid">{Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}</div>
      ) : visible.length === 0 && !error ? (
        <EmptyState
          icon="♡"
          title="Create your first wishlist"
          message="As you search, tap the heart icon to save your favourite places to stay."
          action={<Link to="/" className="btn btn-dark">Start exploring</Link>}
        />
      ) : (
        <div className="grid">
          {visible.map((l) => <ListingCard key={l._id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
