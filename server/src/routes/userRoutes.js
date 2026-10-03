import { Router } from 'express';
import {
  updateProfile,
  changePassword,
  getMyStats,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  submitVerification,
} from '../controllers/userController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { passwordSchema, profileSchema, verificationSchema } from '../validation/schemas.js';

const router = Router();

router.use(protect);

router.patch('/me', validateBody(profileSchema, { partial: true }), updateProfile);
router.patch('/me/password', validateBody(passwordSchema), changePassword);
router.post('/me/verification', requireRole('host'), validateBody(verificationSchema), submitVerification);
router.get('/me/stats', getMyStats);
router.get('/me/wishlist', getWishlist);
router.post('/me/wishlist/:listingId', addToWishlist);
router.delete('/me/wishlist/:listingId', removeFromWishlist);

export default router;
