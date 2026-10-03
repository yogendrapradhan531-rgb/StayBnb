import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import { formatDate, formatFullAddress, formatMoneyExact } from '../utils/format.js';

/**
 * Printable GST tax invoice for a confirmed booking.
 * "Download PDF" uses the browser's print dialog (Save as PDF) with a
 * print stylesheet that hides the app chrome – no PDF library needed.
 */
export default function Invoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingsApi
      .invoice(id)
      .then(({ invoice: inv }) => setInvoice(inv))
      .catch((err) => setError(getErrorMessage(err, 'Could not generate the invoice')));
  }, [id]);

  useEffect(() => {
    if (invoice) document.title = `Invoice ${invoice.number} · Staybnb`;
    return () => { document.title = 'Staybnb – Vacation rentals & places to stay'; };
  }, [invoice]);

  if (error) {
    return (
      <div className="container page narrow">
        <ErrorBox message={error} />
        <Link to={`/bookings/${id}`} className="btn btn-outline">Back to booking</Link>
      </div>
    );
  }
  if (!invoice) return <Spinner full label="Preparing invoice…" />;

  const { seller, billedTo, stay, lines, totals, payment } = invoice;
  const halfRate = (r) => (r ? `${r / 2}%` : '0%');

  return (
    <div className="container page invoice-page">
      <div className="invoice-actions no-print">
        <Link to={`/bookings/${id}`} className="muted back-link">‹ Back to booking</Link>
        <button type="button" className="btn btn-dark" onClick={() => window.print()}>
          ⬇ Download PDF / Print
        </button>
      </div>

      <article className="invoice card" aria-label={`Tax invoice ${invoice.number}`}>
        <header className="invoice-head">
          <div>
            <div className="invoice-brand">staybnb</div>
            <p className="small">{seller.name}<br />{seller.address}</p>
            <p className="small">GSTIN: {seller.gstin || <em>not registered (demo project)</em>}</p>
          </div>
          <div className="invoice-title">
            <h1>Tax Invoice</h1>
            <dl>
              <div><dt>Invoice no.</dt><dd>{invoice.number}</dd></div>
              <div><dt>Invoice date</dt><dd>{formatDate(new Date(invoice.date))}</dd></div>
              <div><dt>Booking ref.</dt><dd>{invoice.confirmationCode}</dd></div>
              <div><dt>Place of supply</dt><dd>{invoice.placeOfSupply}</dd></div>
            </dl>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <h3>Billed to</h3>
            <p><strong>{billedTo.name}</strong><br />{billedTo.email}{billedTo.phone && <><br />+91 {billedTo.phone}</>}</p>
          </div>
          <div>
            <h3>Property</h3>
            <p><strong>{stay.title}</strong><br />{formatFullAddress(stay.address)}</p>
            <p className="small muted">Host: {invoice.host.name}{invoice.host.verified ? ' (verified)' : ''}</p>
          </div>
          <div>
            <h3>Stay</h3>
            <p>
              {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}<br />
              {stay.nights} night{stay.nights > 1 ? 's' : ''} · {stay.guests} guest{stay.guests > 1 ? 's' : ''}
            </p>
          </div>
        </section>

        <div className="table-wrap invoice-table">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>SAC</th>
                <th className="num">Taxable value</th>
                <th className="num">CGST</th>
                <th className="num">SGST</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.description}>
                  <td>{i + 1}</td>
                  <td>{l.description}</td>
                  <td>{l.sac || '—'}</td>
                  <td className="num">{formatMoneyExact(l.taxable)}</td>
                  <td className="num">{formatMoneyExact(l.tax / 2)}<br /><span className="muted small">@ {halfRate(l.rate)}</span></td>
                  <td className="num">{formatMoneyExact(l.tax / 2)}<br /><span className="muted small">@ {halfRate(l.rate)}</span></td>
                  <td className="num">{formatMoneyExact(l.taxable + l.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="invoice-totals">
          <div className="invoice-words">
            <span className="muted small">Amount in words</span>
            <strong>{totals.inWords}</strong>
            <p className="small muted">
              Payment: {payment.method}{payment.paidAt ? ` · paid ${formatDate(new Date(payment.paidAt))}` : ''}
            </p>
          </div>
          <dl>
            <div><dt>Taxable value</dt><dd>{formatMoneyExact(totals.taxable)}</dd></div>
            <div><dt>CGST</dt><dd>{formatMoneyExact(totals.cgst)}</dd></div>
            <div><dt>SGST</dt><dd>{formatMoneyExact(totals.sgst)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{formatMoneyExact(totals.grandTotal)}</dd></div>
          </dl>
        </section>

        <footer className="invoice-foot small muted">
          GST on accommodation is charged by nightly tariff (≤ ₹1,000: nil · ₹1,001–₹7,500: 5% · above ₹7,500: 18%);
          the platform service fee carries 18% GST. Accommodation is taxed in the state where the property is located,
          so tax is split equally into CGST and SGST.
          <br />
          This invoice was generated by a student project for demonstration and is not a valid tax document.
        </footer>
      </article>
    </div>
  );
}
