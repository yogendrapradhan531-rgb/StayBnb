import { useState } from 'react';
import { Link } from 'react-router-dom';
import SmartImage from './SmartImage.jsx';
import HeartButton from './HeartButton.jsx';
import { RatingBadge } from './StarRating.jsx';
import { VerifiedBadge } from './Badges.jsx';
import { ChevronLeft, ChevronRight } from './Icons.jsx';
import { capitalize, formatLocation, formatMoney, plural } from '../utils/format.js';

export default function ListingCard({ listing, search = '', active = false, onHover }) {
  const [idx, setIdx] = useState(0);
  const images = listing.images?.length ? listing.images : [null];
  const isFavourite = listing.reviewCount >= 3 && listing.avgRating >= 4.5;

  const step = (e, dir) => {
    e.preventDefault(); // don't follow the card link
    e.stopPropagation();
    setIdx((i) => (i + dir + images.length) % images.length);
  };

  return (
    <Link
      to={`/listings/${listing._id}${search}`}
      className={active ? 'listing-card active' : 'listing-card'}
      onMouseEnter={() => onHover?.(listing._id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="card-media">
        <SmartImage src={images[idx]} alt={listing.title} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" />
        {isFavourite && <span className="card-badge">Guest favourite</span>}
        <HeartButton listingId={listing._id} />
        {images.length > 1 && (
          <>
            <button type="button" className="carousel-btn prev" aria-label="Previous photo" onClick={(e) => step(e, -1)}>
              <ChevronLeft width={16} height={16} strokeWidth={3} />
            </button>
            <button type="button" className="carousel-btn next" aria-label="Next photo" onClick={(e) => step(e, 1)}>
              <ChevronRight width={16} height={16} strokeWidth={3} />
            </button>
            <div className="dots" aria-hidden="true">
              {images.map((_, i) => <span key={i} className={i === idx ? 'dot on' : 'dot'} />)}
            </div>
          </>
        )}
      </div>
      <div className="card-body">
        <div className="card-row">
          <h3 className="card-title">
            {formatLocation(listing.address)} <VerifiedBadge compact status={listing.host?.hostVerification?.status} />
          </h3>
          <RatingBadge rating={listing.avgRating} count={listing.reviewCount} showCount={false} />
        </div>
        <p className="muted card-sub">{listing.title}</p>
        <p className="muted card-sub">
          {capitalize(listing.propertyType)} · {plural(listing.maxGuests, 'guest')} · {plural(listing.bedrooms, 'bedroom')}
        </p>
        <p className="card-price">
          <strong>{formatMoney(listing.pricePerNight)}</strong> <span className="muted">night</span>
        </p>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="listing-card skeleton" aria-hidden="true">
      <div className="card-media shimmer" />
      <div className="card-body">
        <div className="line shimmer" style={{ width: '70%' }} />
        <div className="line shimmer" style={{ width: '50%' }} />
        <div className="line shimmer" style={{ width: '30%' }} />
      </div>
    </div>
  );
}
