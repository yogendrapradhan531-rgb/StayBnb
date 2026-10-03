/**
 * Every error the API sends has the same shape:
 *   { message: string, code: string, errors?: { [field]: message } }
 * `code` is a stable machine-readable identifier (see ERROR_CODES) so the
 * frontend can react to specific failures without parsing message text.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  DATES_UNAVAILABLE: 'DATES_UNAVAILABLE',
  LISTING_NOT_BOOKABLE: 'LISTING_NOT_BOOKABLE',
  HOST_NOT_VERIFIED: 'HOST_NOT_VERIFIED',
  INVOICE_NOT_AVAILABLE: 'INVOICE_NOT_AVAILABLE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  INTERNAL: 'INTERNAL',
};

export class ApiError extends Error {
  constructor(statusCode, message, { code, errors } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || defaultCode(statusCode);
    this.errors = errors;
  }

  static badRequest(msg, opts) {
    return new ApiError(400, msg, opts);
  }
  /** Field-level validation failure: errors = { field: 'message' } */
  static validation(errors, msg) {
    const first = Object.values(errors)[0];
    return new ApiError(400, msg || first || 'Please correct the highlighted fields', {
      code: ERROR_CODES.VALIDATION_ERROR,
      errors,
    });
  }
  static unauthorized(msg = 'Please log in to continue', opts) {
    return new ApiError(401, msg, opts);
  }
  static forbidden(msg = 'You do not have permission to do that', opts) {
    return new ApiError(403, msg, opts);
  }
  static notFound(msg = 'We couldn’t find what you were looking for', opts) {
    return new ApiError(404, msg, opts);
  }
  static conflict(msg, opts) {
    return new ApiError(409, msg, opts);
  }
}

function defaultCode(status) {
  return (
    {
      400: ERROR_CODES.BAD_REQUEST,
      401: ERROR_CODES.UNAUTHENTICATED,
      403: ERROR_CODES.FORBIDDEN,
      404: ERROR_CODES.NOT_FOUND,
      409: ERROR_CODES.DUPLICATE,
    }[status] || (status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.BAD_REQUEST)
  );
}
