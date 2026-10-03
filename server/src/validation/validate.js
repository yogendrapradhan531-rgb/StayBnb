/**
 * A tiny, dependency-free validation layer.
 *
 *   const schema = { name: [required('Tell us your name'), minLength(2)] };
 *   const errors = runSchema(req.body, schema);   // → { name: '…' } or null
 *
 * Rules are functions (value, data) → error message | null.
 * Keys may be dotted paths ('address.city'). In partial mode (updates)
 * fields that are absent from the body are skipped.
 */
import { ApiError } from '../utils/ApiError.js';

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// ---------- rules ----------
export const required = (msg = 'This field is required') => (v) => (isEmpty(v) ? msg : null);

export const minLength = (n, msg) => (v) =>
  isEmpty(v) || String(v).trim().length >= n ? null : msg || `Must be at least ${n} characters`;

export const maxLength = (n, msg) => (v) =>
  isEmpty(v) || String(v).trim().length <= n ? null : msg || `Must be ${n} characters or fewer`;

export const matches = (re, msg) => (v) => (isEmpty(v) || re.test(String(v).trim()) ? null : msg);

export const oneOf = (list, msg) => (v) => (isEmpty(v) || list.includes(v) ? null : msg || `Must be one of: ${list.join(', ')}`);

export const number = ({ min, max, integer = false } = {}, msgs = {}) => (v) => {
  if (isEmpty(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return msgs.type || 'Enter a number';
  if (integer && !Number.isInteger(n)) return msgs.integer || 'Enter a whole number';
  if (min !== undefined && n < min) return msgs.min || `Must be at least ${min}`;
  if (max !== undefined && n > max) return msgs.max || `Must be ${max} or less`;
  return null;
};

export const isoDate = (msg = 'Use the date format YYYY-MM-DD') => (v) =>
  isEmpty(v) || /^\d{4}-\d{2}-\d{2}$/.test(String(v).slice(0, 10)) ? null : msg;

export const url = (msg = 'Enter a full link starting with http:// or https://') => (v) =>
  isEmpty(v) || /^https?:\/\/\S+$/i.test(String(v).trim()) ? null : msg;

export const custom = (fn) => fn;

// ---------- runner ----------
export function runSchema(data, schema, { partial = false } = {}) {
  const errors = {};
  for (const [path, rules] of Object.entries(schema)) {
    const value = getPath(data, path);
    if (partial && value === undefined) continue;
    for (const rule of rules) {
      const msg = rule(value, data);
      if (msg) {
        errors[path] = msg;
        break; // one message per field – the first that fails
      }
    }
  }
  return Object.keys(errors).length ? errors : null;
}

/** Express middleware: 400 VALIDATION_ERROR with field messages if the body is invalid. */
export const validateBody = (schema, opts) => (req, _res, next) => {
  const errors = runSchema(req.body || {}, schema, opts);
  if (errors) return next(ApiError.validation(errors));
  next();
};
