import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Promise-friendly confirmation dialog.
 * onConfirm may be async – the button shows a busy state until it settles.
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
      onClose?.();
    } catch {
      /* caller shows its own error toast; keep dialog open */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-link" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-dark'} onClick={confirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {typeof message === 'string' ? <p className="muted">{message}</p> : message}
    </Modal>
  );
}
