import { useEffect, useState } from 'react';
import { configApi } from '../api/services.js';

const DEFAULT = { paymentsEnabled: false, gstEnabled: true, currency: import.meta.env.VITE_CURRENCY || 'INR' };
let cached = null;
let inflight = null;

/** Public server settings (e.g. whether Stripe payments are on). Fetched once per page load. */
export function useConfig() {
  const [config, setConfig] = useState(cached || DEFAULT);

  useEffect(() => {
    if (cached) return;
    inflight = inflight || configApi.get().catch(() => DEFAULT);
    inflight.then((c) => {
      cached = { ...DEFAULT, ...c };
      setConfig(cached);
    });
  }, []);

  return config;
}
