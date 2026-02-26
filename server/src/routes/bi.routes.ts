import { Router } from 'express';
import { BIController } from '../controllers/bi.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);
router.use(authorizePermission(['employees', 'attendance', 'products', 'sales', 'dashboard']));

router.get('/labor-analytics', BIController.getLaborAnalytics);
router.get('/dashboard', BIController.getDashboardAnalytics);
router.get('/payroll', BIController.getPayroll);
router.get('/commissions', BIController.getCommissions);

export default router;
