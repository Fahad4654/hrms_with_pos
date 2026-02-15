import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/checkout', SaleController.checkout);
router.get('/history', authorize([Role.ADMIN, Role.MANAGER]), SaleController.getHistory);

export default router;
