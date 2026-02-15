import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.post('/checkout', SaleController.checkout);
router.get('/history', authorizePermission(['sales']), SaleController.getHistory);

export default router;
