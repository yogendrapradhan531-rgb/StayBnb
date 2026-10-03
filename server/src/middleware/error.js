import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../utils/ApiError.js';

export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: ERROR_CODES.NOT_FOUND,
  });
}

const DUPLICATE_MESSAGES = {
  email: 'An account with this email already exists – try logging in instead',
  booking: 'You have already reviewed this stay',
};

/**
 * Central error handler. Converts every kind of failure into the same shape:
 *   { message, code, errors? }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code && typeof err.code === 'string' ? err.code : undefined;
  let errors = err.errors && !(err instanceof mongoose.Error.ValidationError) ? err.errors : undefined;

  if (err instanceof mongoose.Error.ValidationError) {
    // Schema-level checks (last line of defence) → field map
    status = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
    message = Object.values(errors)[0] || 'Please correct the highlighted fields';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = ERROR_CODES.BAD_REQUEST;
    message = `That ${err.path === '_id' ? 'ID' : err.path} doesn’t look right`;
  } else if (err.code === 11000) {
    status = 409;
    code = ERROR_CODES.DUPLICATE;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = DUPLICATE_MESSAGES[field] || `That ${field} is already in use`;
    errors = { [field]: message };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = ERROR_CODES.BAD_REQUEST;
    message = 'The request body isn’t valid JSON';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 && env.isProd ? 'Something went wrong on our side. Please try again.' : message,
    code: code || (status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.BAD_REQUEST),
    ...(errors && { errors }),
    ...(!env.isProd && status >= 500 && { stack: err.stack }),
  });
}
