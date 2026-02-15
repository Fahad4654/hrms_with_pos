import { Router } from 'express';
import { BIController } from '../controllers/bi.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER']));

router.get('/labor-analytics', BIController.getLaborAnalytics);
router.get('/payroll', BIController.getPayroll);
router.get('/commissions', BIController.getCommissions);

export default router;
