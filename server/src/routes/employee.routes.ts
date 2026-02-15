import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.get('/', authorize(['ADMIN', 'MANAGER']), EmployeeController.getAll);
router.get('/:id', authorize(['ADMIN', 'MANAGER', 'STAFF']), EmployeeController.getById);
router.post('/', authorize(['ADMIN']), EmployeeController.create);
router.put('/:id', authorize(['ADMIN']), EmployeeController.update);
router.delete('/:id', authorize(['ADMIN']), EmployeeController.delete);

export default router;
