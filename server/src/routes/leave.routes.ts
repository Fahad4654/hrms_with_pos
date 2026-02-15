import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.post('/request', LeaveController.request);
router.get('/my-leaves', LeaveController.getMyLeaves);

// Manager/Admin only routes
router.get('/pending', authorizePermission(['attendance']), LeaveController.getPending);
router.patch('/:id/status', authorizePermission(['attendance']), LeaveController.updateStatus);

export default router;
