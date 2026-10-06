import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { bookingsApi, listingsApi } from '../api/services.js';
import { useToast } from '../context/ToastContext.jsx';
import HeartButton from '../components/HeartButton.jsx';
import Avatar from '../components/Avatar.jsx';
import { ShareIcon } from '../components/Icons.jsx';
import { getErrorMessage } from '../api/client.js';
import SmartImage from '../components/SmartImage.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import EmptyState from '../components/EmptyState.jsx';
import BookingWidget from '../components/BookingWidget.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import { RatingBadge } from '../components/StarRating.jsx';
import { ListingStatusBadge, VerifiedBadge } from '../components/Badges.jsx';
import { capitalize, formatDate, formatFullAddress, formatLocation, plural } from '../utils/format.js';

const ListingMap = lazy(() => import('../components/ListingMap.jsx'));

const AMENITY_ICONS = {
  wifi: '📶', kitchen: '🍳', washer: '🧺', 'air conditioning': '❄️', heating: '🔥', pool: '🏊',
  'free parking': '🅿️', tv: '📺', workspace: '💻', 'hot tub': '🛁', 'pet friendly': '🐾', 'beach access': '🏖️',  'power backup': '🔋',
};

export default function ListingDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    listingsApi
      .get(id)
      .then(({ listing: l, canManage: cm }) => {
        if (!alive) return;
        setListing(l);
        setCanManage(Boolean(cm));
      })
      .catch((err) => {
        if (!alive) return;
        if ([400, 404].includes(err.response?.status)) setNotFound(true);
        else setError(getErrorMessage(err, 'Could not load this listing'));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, reload]);

  // Guest came back from Stripe without paying → release the held dates
  const paymentHandled = useRef(false);
  useEffect(() => {
    const cancelledBooking = searchParams.get('booking');
    if (paymentHandled.current || searchParams.get('payment') !== 'cancelled' || !cancelledBooking) return;
    paymentHandled.current = true;
    bookingsApi
      .cancel(cancelledBooking)
      .catch(() => {}) // already expired/cancelled – nothing to do
      .finally(() => toast.info('Payment cancelled – your dates were released.'));
    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('booking');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    const url = window.location.href.split('?')[0];
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  useEffect(() => {
    if (listing) document.title = `${listing.title} · Staybnb`;
    return () => { document.title = 'Staybnb – Vacation rentals & places to stay'; };
  }, [listing]);

  if (loading) return <Spinner full />;
  if (notFound) {
    return (
      <div className="container page">
        <EmptyState icon="🏚️" title="Listing not found" message="It may have been removed by the host."
          action={<Link to="/" className="btn btn-dark">Explore stays</Link>} />
      </div>
    );
  }
  if (error || !listing) {
    return <div className="container page"><ErrorBox message={error} onRetry={() => setReload((r) => r + 1)} /></div>;
  }

  const [hero, ...rest] = listing.images;
  const initial = {
    checkIn: searchParams.get('checkIn'),
    checkOut: searchParams.get('checkOut'),
    guests: searchParams.get('guests'),
  };

  return (
    <div className="container page listing-detail">
      {listing.status !== 'approved' && (
        <div className={listing.status === 'rejected' ? 'alert alert-error' : 'alert alert-warning'} role="status">
          <span>
            <ListingStatusBadge status={listing.status} />{' '}
            {listing.status === 'pending'
              ? 'Only you (and our review team) can see this listing until it’s approved.'
              : `Not published: ${listing.rejectionReason || 'please update the listing and resubmit.'}`}
          </span>
          {canManage && <Link to={`/host/listings/${listing._id}/edit`} className="btn btn-dark">Edit listing</Link>}
        </div>
      )}

      <div className="detail-head">
        <div>
          <h1>{listing.title}</h1>
          <div className="row gap muted detail-sub">
            <RatingBadge rating={listing.avgRating} count={listing.reviewCount} />
            <span>·</span>
            <span>{formatLocation(listing.address)}</span>
          </div>
        </div>
        <div className="row gap">
          <button type="button" className="btn btn-ghost" onClick={share}>
            <ShareIcon width={16} height={16} /> Share
          </button>
          <HeartButton listingId={listing._id} variant="text" />
        </div>
      </div>

      <div className={`gallery gallery-${Math.min(listing.images.length, 5)}`}>
        <div className="gallery-main">
          <SmartImage src={hero} alt={listing.title} eager width={1080} sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
        {rest.slice(0, 4).map((img, i) => (
          <div key={img + i} className="gallery-thumb">
            <SmartImage src={img} alt={`${listing.title} photo ${i + 2}`} width={720} sizes="25vw" />
          </div>
        ))}
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section host-line">
            <div>
              <h2>
                {capitalize(listing.propertyType)} hosted by {listing.host?.name || 'a host'}
              </h2>
              <p className="muted">
                {plural(listing.maxGuests, 'guest')} · {plural(listing.bedrooms, 'bedroom')} ·{' '}
                {plural(listing.beds, 'bed')} · {plural(listing.bathrooms, 'bath')}
                {listing.minNights > 1 && <> · {plural(listing.minNights, 'night')} minimum</>}
              </p>
              <div className="row gap wrap host-meta">
                <VerifiedBadge status={listing.host?.hostVerification?.status} />
                {listing.host?.createdAt && (
                  <span className="muted small">Hosting since {formatDate(listing.host.createdAt, { month: 'long', year: 'numeric' })}</span>
                )}
              </div>
              {listing.host?.bio && <p className="muted small host-bio">“{listing.host.bio}”</p>}
            </div>
            {listing.host && <Avatar user={listing.host} size={56} />}
          </section>

          <section className="detail-section">
            <h2>About this place</h2>
            <p className="description">{listing.description}</p>
          </section>

          {listing.amenities?.length > 0 && (
            <section className="detail-section">
              <h2>What this place offers</h2>
              <ul className="amenity-list">
                {listing.amenities.map((a) => (
                  <li key={a}><span aria-hidden="true">{AMENITY_ICONS[a] || '✔️'}</span> {capitalize(a)}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-section">
            <h2>Where you’ll be</h2>
            <p className="muted">
              {formatFullAddress(listing.address)}
            </p>
            <Suspense fallback={<Spinner />}>
              <ListingMap listings={[listing]} height="360px" />
            </Suspense>
          </section>

          <ReviewsSection listingId={listing._id} avgRating={listing.avgRating} reviewCount={listing.reviewCount} />
        </div>

        <aside className="detail-aside">
          <BookingWidget listing={listing} initial={initial} />
        </aside>
      </div>
    </div>
  );
}
