import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired – please log in again');
  }
  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('This account no longer exists');
  if (user.isSuspended) {
    throw ApiError.forbidden(
      `Your account has been suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ''}. Contact support@staybnb.example.`,
      { code: ERROR_CODES.ACCOUNT_SUSPENDED }
    );
  }
  return user;
}

/** Requires a valid JWT. Attaches the user document as req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized('Please log in to continue');
  req.user = await userFromToken(token);
  next();
});

/** Attaches req.user when a valid token is sent, but never blocks the request. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await userFromToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
});

/** Restricts a route to one or more roles. Use after `protect`. */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    const who = roles.includes('admin') ? 'admins' : 'hosts';
    return next(ApiError.forbidden(`Only ${who} can do this`));
  }
  next();
};
