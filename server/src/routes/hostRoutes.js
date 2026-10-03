import { Router } from 'express';
import {
  getHostListings,
  getHostBookings,
  getHostStats,
  getHostAnalytics,
  getListingCalendar,
  createBlock,
  deleteBlock,
} from '../controllers/hostController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { blockSchema } from '../validation/schemas.js';

const router = Router();

router.use(protect, requireRole('host'));

router.get('/listings', getHostListings);
router.get('/bookings', getHostBookings);
router.get('/stats', getHostStats);
router.get('/analytics', getHostAnalytics);
router.get('/listings/:id/calendar', getListingCalendar);
router.post('/listings/:id/blocks', validateBody(blockSchema), createBlock);
router.delete('/listings/:id/blocks/:blockId', deleteBlock);

export default router;
