import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const authResponse = (res, status, user) =>
  res.status(status).json({ token: signToken(user), user });

// POST /api/auth/register   (body validated by registerSchema in the route)
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.exists({ email: String(email).toLowerCase().trim() });
  if (exists) {
    throw ApiError.conflict('An account with this email already exists – try logging in instead', {
      code: ERROR_CODES.DUPLICATE,
      errors: { email: 'This email is already registered' },
    });
  }
  const user = await User.create({
    name,
    email,
    password,
    role: role === 'host' ? 'host' : 'guest', // admins are never self-registered
  });
  authResponse(res, 201, user);
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    // Same message for both cases so attackers can't discover which emails exist
    throw ApiError.unauthorized('That email and password don’t match. Please try again.', {
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  }
  if (user.isSuspended) {
    throw ApiError.forbidden(
      `Your account has been suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ''}.`,
      { code: ERROR_CODES.ACCOUNT_SUSPENDED }
    );
  }
  authResponse(res, 200, user);
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/become-host
export const becomeHost = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') throw ApiError.badRequest('Admin accounts can’t become hosts');
  if (req.user.role !== 'host') {
    req.user.role = 'host';
    await req.user.save();
  }
  // New token because the role is embedded in the JWT payload
  authResponse(res, 200, req.user);
});
