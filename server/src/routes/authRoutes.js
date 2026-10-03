import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, becomeHost } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';

const router = Router();

// Slow down brute-force attempts on credentials
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts – please wait 15 minutes and try again', code: 'RATE_LIMITED' },
});

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.get('/me', protect, me);
router.patch('/become-host', protect, becomeHost);

export default router;
