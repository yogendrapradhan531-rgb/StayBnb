import { Router } from 'express';
import {
  getMeta,
  getListings,
  getListing,
  getAvailability,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/listingController.js';
import { getListingReviews } from '../controllers/reviewController.js';
import { protect, optionalAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { listingSchema } from '../validation/schemas.js';

const router = Router();

// Public reads
router.get('/', getListings);
router.get('/meta', getMeta);
router.get('/:id', optionalAuth, getListing);
router.get('/:id/availability', getAvailability);
router.get('/:id/reviews', getListingReviews);

// Writes are gated behind auth + host role
router.post('/', protect, requireRole('host'), validateBody(listingSchema), createListing);
router.put('/:id', protect, requireRole('host'), validateBody(listingSchema, { partial: true }), updateListing);
router.delete('/:id', protect, requireRole('host'), deleteListing);

export default router;
