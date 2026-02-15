import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.post('/checkout', SaleController.checkout);
router.get('/history', authorize(['ADMIN', 'MANAGER']), SaleController.getHistory);

export default router;
