import { Router } from 'express';
import { confirmPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

// The webhook route lives in app.js because it needs the raw request body.
const router = Router();

router.get('/confirm', protect, confirmPayment);

export default router;
