import { Router } from 'express';
import {
  getAdminStats,
  getAdminListings,
  approveListing,
  rejectListing,
  getVerifications,
  approveVerification,
  rejectVerification,
  getUsers,
  suspendUser,
  unsuspendUser,
} from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { rejectSchema } from '../validation/schemas.js';

// Everything here is admin-only
const router = Router();
router.use(protect, requireRole('admin'));

router.get('/stats', getAdminStats);

router.get('/listings', getAdminListings);
router.patch('/listings/:id/approve', approveListing);
router.patch('/listings/:id/reject', validateBody(rejectSchema), rejectListing);

router.get('/verifications', getVerifications);
router.patch('/verifications/:userId/approve', approveVerification);
router.patch('/verifications/:userId/reject', validateBody(rejectSchema), rejectVerification);

router.get('/users', getUsers);
router.patch('/users/:id/suspend', validateBody(rejectSchema), suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);

export default router;
