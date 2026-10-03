const LABELS = {
  paid: 'Paid',
  unpaid: 'Awaiting payment',
  refunded: 'Refunded',
  not_required: 'No payment needed',
};

/** Small pill describing a booking's payment state. */
export default function PaymentBadge({ status = 'not_required' }) {
  return <span className={`pay-badge pay-${status}`}>{LABELS[status] || status}</span>;
}
