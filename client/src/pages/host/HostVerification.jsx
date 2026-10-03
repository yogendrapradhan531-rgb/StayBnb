import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usersApi } from '../../api/services.js';
import { getErrorMessage } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import FieldError, { errorId, errorProps } from '../../components/FieldError.jsx';
import { VerificationBadge } from '../../components/Badges.jsx';
import { formatDate } from '../../utils/format.js';
import { fieldErrorsFrom, hasErrors, validateVerification } from '../../utils/validation.js';

/**
 * Host verification card shown at the top of the host dashboard.
 * unverified/rejected → "Verify now" form · pending → under review · verified → badge
 */
export default function HostVerification() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const v = user.hostVerification || { status: 'unverified' };

  if (v.status === 'verified') {
    return (
      <div className="verify-card verified">
        <span className="verify-icon" aria-hidden="true">✓</span>
        <div>
          <strong>You’re a verified host</strong>
          <p className="muted small">
            {v.legalName} · PAN {v.panMasked} · verified {formatDate(v.reviewedAt)}
          </p>
        </div>
        <VerificationBadge status="verified" />
      </div>
    );
  }

  return (
    <>
      <div className={`verify-card ${v.status}`}>
        <span className="verify-icon" aria-hidden="true">{v.status === 'pending' ? '⏳' : v.status === 'rejected' ? '!' : '🪪'}</span>
        <div>
          <strong>
            {v.status === 'pending' && 'Your verification is under review'}
            {v.status === 'rejected' && 'Your verification needs another look'}
            {v.status === 'unverified' && 'Verify your identity to publish listings'}
          </strong>
          <p className="muted small">
            {v.status === 'pending' && `Submitted ${formatDate(v.submittedAt)}. Your listings can be approved once you’re verified.`}
            {v.status === 'rejected' && `Reason: ${v.rejectionReason}`}
            {v.status === 'unverified' && 'Guests book with more confidence when they see the verified badge. It takes 2 minutes.'}
          </p>
        </div>
        {v.status !== 'pending' ? (
          <button type="button" className="btn btn-dark" onClick={() => setOpen(true)}>
            {v.status === 'rejected' ? 'Resubmit' : 'Verify now'}
          </button>
        ) : (
          <VerificationBadge status="pending" />
        )}
      </div>
      <VerificationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function VerificationModal({ open, onClose }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    legalName: user.hostVerification?.legalName || user.name,
    pan: '',
    phone: user.phone || '',
    aadhaarLast4: '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key, transform = (x) => x) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : transform(e.target.value);
    setErrors((errs) => ({ ...errs, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = validateVerification(form);
    if (hasErrors(problems)) return setErrors(problems);
    setBusy(true);
    try {
      const res = await usersApi.submitVerification({ ...form, pan: form.pan.toUpperCase() });
      setUser(res.user);
      toast.success(res.message);
      onClose();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Verify your identity" size="md">
      <form onSubmit={submit} noValidate>
        <p className="muted small privacy-note">
          🔒 We only store a masked PAN (e.g. AB<b>XXX</b>1234F) and the last 4 digits of your Aadhaar.
          Your full PAN is only checked for format on our server and is never saved.
        </p>
        <label className="field">
          <span>Full name as on PAN</span>
          <input value={form.legalName} onChange={set('legalName')} autoComplete="name" {...errorProps(errors, 'legalName')} />
          <FieldError id={errorId('legalName')} message={errors.legalName} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>PAN</span>
            <input value={form.pan} maxLength={10} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }}
              onChange={set('pan', (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} {...errorProps(errors, 'pan')} />
            <FieldError id={errorId('pan')} message={errors.pan} />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input value={form.phone} inputMode="tel" placeholder="98450 12345" autoComplete="tel"
              onChange={set('phone')} {...errorProps(errors, 'phone')} />
            <FieldError id={errorId('phone')} message={errors.phone} />
          </label>
          <label className="field">
            <span>Aadhaar – last 4 digits</span>
            <input value={form.aadhaarLast4} inputMode="numeric" maxLength={4} placeholder="1234"
              onChange={set('aadhaarLast4', (v) => v.replace(/\D/g, '').slice(0, 4))} {...errorProps(errors, 'aadhaarLast4')} />
            <FieldError id={errorId('aadhaarLast4')} message={errors.aadhaarLast4} />
          </label>
        </div>
        <label className="checkbox consent">
          <input type="checkbox" checked={form.consent} onChange={set('consent')} {...errorProps(errors, 'consent')} />
          I confirm these details are mine and accurate.
        </label>
        <FieldError id={errorId('consent')} message={errors.consent} />
        <div className="row gap modal-actions">
          <button type="button" className="btn btn-link" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        </div>
      </form>
    </Modal>
  );
}
