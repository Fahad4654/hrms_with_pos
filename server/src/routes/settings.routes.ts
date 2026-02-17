import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Company Settings (Admin only - using 'all' or specific 'settings' permission if we had one, defaulting to 'all' for now or reuse existing)
// For now let's say 'all' or 'attendance' managers can view, but only 'all' can edit company settings? 
// Let's stick to 'all' or a broad permission. 'all' is safe for admin settings.

router.get('/company', SettingsController.getCompany);
router.put('/company', authorizePermission(['all']), SettingsController.updateCompany);

// Leave Types
router.get('/leave-types', SettingsController.getLeaveTypes);
router.post('/leave-types', authorizePermission(['all']), SettingsController.createLeaveType);
router.put('/leave-types/:id', authorizePermission(['all']), SettingsController.updateLeaveType);
router.delete('/leave-types/:id', authorizePermission(['all']), SettingsController.deleteLeaveType);

export default router;
