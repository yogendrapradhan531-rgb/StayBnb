import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY } from '../api/client.js';
import { authApi, usersApi } from '../api/services.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) – session only */
  }
}

function hasToken() {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

const toIdSet = (list = []) => new Set(list.map(String));

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u) => {
    setUser(u);
    setWishlist(toIdSet(u?.wishlist));
    return u;
  }, []);

  const handleAuth = useCallback(
    ({ token, user: u }) => {
      saveToken(token);
      return applyUser(u);
    },
    [applyUser]
  );

  const logout = useCallback(() => {
    saveToken(null);
    applyUser(null);
  }, [applyUser]);

  // Restore session on first load
  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: u }) => applyUser(u))
      .catch(() => saveToken(null))
      .finally(() => setLoading(false));
  }, [applyUser]);

  // The axios interceptor fires this when the API returns 401
  useEffect(() => {
    const onExpired = (e) => {
      logout();
      if (e.detail) toast.error(e.detail);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [logout, toast]);

  /** Optimistically saves/unsaves a listing. Returns the new saved state. */
  const toggleWishlist = useCallback(
    async (listingId) => {
      const id = String(listingId);
      const wasSaved = wishlist.has(id);
      const flip = (save) =>
        setWishlist((prev) => {
          const next = new Set(prev);
          if (save) next.add(id);
          else next.delete(id);
          return next;
        });

      flip(!wasSaved);
      try {
        const { wishlist: serverList } = wasSaved ? await usersApi.unsave(id) : await usersApi.save(id);
        setWishlist(toIdSet(serverList));
        return !wasSaved;
      } catch (err) {
        flip(wasSaved); // roll back
        throw err;
      }
    },
    [wishlist]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isHost: user?.role === 'host',
      isAdmin: user?.role === 'admin',
      isVerifiedHost: user?.role === 'host' && user?.hostVerification?.status === 'verified',
      setUser: applyUser,
      wishlist,
      isSaved: (id) => wishlist.has(String(id)),
      toggleWishlist,
      login: (data) => authApi.login(data).then(handleAuth),
      register: (data) => authApi.register(data).then(handleAuth),
      becomeHost: () => authApi.becomeHost().then(handleAuth),
      updateProfile: (data) => usersApi.updateProfile(data).then(({ user: u }) => applyUser(u)),
      logout,
    }),
    [user, loading, wishlist, toggleWishlist, handleAuth, applyUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
