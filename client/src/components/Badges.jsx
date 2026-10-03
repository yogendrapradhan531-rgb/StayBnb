/** Blue tick shown next to identity-verified hosts. */
export function VerifiedBadge({ status, compact = false }) {
  if (status !== 'verified') return null;
  return (
    <span className={compact ? 'verified-badge compact' : 'verified-badge'} title="Identity verified by Staybnb">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && 'Verified host'}
    </span>
  );
}

const LISTING_STATUS = {
  pending: ['Pending review', 'status-pending'],
  approved: ['Approved', 'status-confirmed'],
  rejected: ['Changes needed', 'status-rejected'],
};

/** Moderation status of a listing (approval workflow). */
export function ListingStatusBadge({ status }) {
  const [label, cls] = LISTING_STATUS[status] || [status, ''];
  return <span className={`status ${cls}`}>{label}</span>;
}

const VERIFICATION = {
  unverified: ['Not verified', 'status-cancelled'],
  pending: ['Under review', 'status-pending'],
  verified: ['Verified', 'status-confirmed'],
  rejected: ['Rejected', 'status-rejected'],
};

export function VerificationBadge({ status = 'unverified' }) {
  const [label, cls] = VERIFICATION[status] || [status, ''];
  return <span className={`status ${cls}`}>{label}</span>;
}
