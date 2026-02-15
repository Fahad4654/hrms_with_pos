import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.post('/request', LeaveController.request);
router.get('/my-leaves', LeaveController.getMyLeaves);

// Manager/Admin only routes
router.get('/pending', authorize(['ADMIN', 'MANAGER']), LeaveController.getPending);
router.patch('/:id/status', authorize(['ADMIN', 'MANAGER']), LeaveController.updateStatus);

export default router;
