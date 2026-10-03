import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const ICONS = { success: '✓', error: '!', info: 'i' };

/**
 * Lightweight toast notifications.
 *   const toast = useToast();
 *   toast.success('Saved!'); toast.error('Oops'); toast.info('FYI', { duration: 6000 })
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 200);
  }, []);

  const show = useCallback(
    (type, message, { duration = 4000 } = {}) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]); // max 4 on screen
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (msg, opts) => show('success', msg, opts),
      error: (msg, opts) => show('error', msg, { duration: 6000, ...opts }),
      info: (msg, opts) => show('info', msg, opts),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}${t.leaving ? ' leaving' : ''}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
