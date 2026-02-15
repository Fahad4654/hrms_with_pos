import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.get('/', authorizePermission(['employees']), EmployeeController.getAll);
router.get('/:id', authorizePermission(['employees']), EmployeeController.getById);
router.post('/', authorizePermission(['employees']), EmployeeController.create);
router.put('/:id', authorizePermission(['employees']), EmployeeController.update);
router.delete('/:id', authorizePermission(['employees']), EmployeeController.delete);

export default router;
