import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/request', LeaveController.request);
router.get('/my-leaves', LeaveController.getMyLeaves);

// Manager/Admin only routes
router.get('/pending', authorize([Role.ADMIN, Role.MANAGER]), LeaveController.getPending);
router.patch('/:id/status', authorize([Role.ADMIN, Role.MANAGER]), LeaveController.updateStatus);

export default router;
