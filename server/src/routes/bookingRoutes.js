import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBooking,
  resumePayment,
  cancelBooking,
} from '../controllers/bookingController.js';
import { getInvoice } from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../validation/validate.js';
import { bookingSchema } from '../validation/schemas.js';

const router = Router();

router.use(protect);

router.post('/', validateBody(bookingSchema), createBooking);
router.get('/me', getMyBookings);
router.get('/:id', getBooking);
router.get('/:id/invoice', getInvoice);
router.post('/:id/pay', resumePayment);
router.patch('/:id/cancel', cancelBooking);

export default router;
