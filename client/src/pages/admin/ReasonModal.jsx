import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import FieldError, { errorId, errorProps } from '../../components/FieldError.jsx';
import { fieldErrorsFrom } from '../../utils/validation.js';

/** Asks an admin for a reason (reject listing / reject verification / suspend user). */
export default function ReasonModal({ open, title, intro, confirmLabel = 'Confirm', suggestions = [], onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) return setError('Give a reason of at least 10 characters');
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(fieldErrorsFrom(err).reason || '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <form onSubmit={submit} noValidate>
        {intro && <p className="muted">{intro}</p>}
        {suggestions.length > 0 && (
          <div className="chips reason-chips">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => { setReason(s); setError(''); }}>{s}</button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Reason (shown to the user)</span>
          <textarea rows={4} maxLength={300} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} {...errorProps({ reason: error }, 'reason')} />
          <small className="muted">{reason.length}/300</small>
          <FieldError id={errorId('reason')} message={error} />
        </label>
        <div className="row gap modal-actions">
          <button type="button" className="btn btn-link" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={busy}>{busy ? 'Saving…' : confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
