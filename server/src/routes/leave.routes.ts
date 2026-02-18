import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.post('/request', authorizePermission(['all', 'leaves']), LeaveController.request);
router.get('/my-leaves', authorizePermission(['all', 'leaves']), LeaveController.getMyLeaves);
router.get('/summary', authorizePermission(['all', 'leaves']), LeaveController.getSummary);

// Manager/Admin only routes
router.get('/pending', authorizePermission(['all', 'attendance', 'leave-approvals']), LeaveController.getPending);
router.patch('/:id/status', authorizePermission(['all', 'attendance', 'leave-approvals']), LeaveController.updateStatus);

export default router;
