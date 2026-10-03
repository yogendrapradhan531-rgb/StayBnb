import { Router } from 'express';
import { createReview, updateReview, deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { reviewSchema } from '../validation/schemas.js';

const router = Router();

router.use(protect);

router.post('/', validateBody(reviewSchema), createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;
