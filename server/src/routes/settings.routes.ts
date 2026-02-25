import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

// Publicly accessible settings for branding
router.get('/company', SettingsController.getCompany);

router.use(authenticate);
router.put('/company', authorizePermission(['all']), SettingsController.updateCompany);

// Leave Types
router.get('/leave-types', SettingsController.getLeaveTypes);
router.post('/leave-types', authorizePermission(['all']), SettingsController.createLeaveType);
router.put('/leave-types/:id', authorizePermission(['all']), SettingsController.updateLeaveType);
router.delete('/leave-types/:id', authorizePermission(['all']), SettingsController.deleteLeaveType);
router.get('/leave-types/:name/utilization', authorizePermission(['all']), SettingsController.getLeaveUtilization);

export default router;
