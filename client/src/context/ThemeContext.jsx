import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'staybnb_theme'; // 'light' | 'dark' | 'system'
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function readPreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const resolve = (pref) => (pref === 'system' ? (media()?.matches ? 'dark' : 'light') : pref);

/**
 * Dark mode. The resolved theme is written to <html data-theme="…">, and all
 * colours in index.css are CSS variables that switch on that attribute.
 * index.html runs a tiny inline script that does the same before React loads,
 * so there is no white flash on refresh.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [theme, setTheme] = useState(() => resolve(readPreference()));

  useEffect(() => {
    const apply = () => {
      const next = resolve(preference);
      setTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    };
    apply();
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* storage unavailable */
    }
    // Follow the OS setting live while on "system"
    const mq = media();
    if (preference !== 'system' || !mq) return undefined;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference]);

  const toggle = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme]);

  const value = useMemo(() => ({ theme, preference, setPreference, toggle }), [theme, preference, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
