import axios from 'axios';

export const TOKEN_KEY = 'staybnb_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token expired, tell the app to log out
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const { status, data } = err.response || {};
    // Expired token, or an admin suspended this account → log out everywhere
    if (readToken() && (status === 401 || data?.code === 'ACCOUNT_SUSPENDED')) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: data?.message }));
    }
    return Promise.reject(err);
  }
);

/** Machine-readable error code from the API (see server/src/utils/ApiError.js). */
export const getErrorCode = (err) => err?.response?.data?.code;

/** Human-readable message from an axios error. */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.status === 429) return 'Too many attempts – please wait a few minutes and try again';
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Is the API running?';
  return err?.message || fallback;
}
