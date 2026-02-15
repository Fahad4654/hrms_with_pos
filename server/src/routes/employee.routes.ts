import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.MANAGER]), EmployeeController.getAll);
router.get('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.STAFF]), EmployeeController.getById);
router.post('/', authorize([Role.ADMIN]), EmployeeController.create);
router.put('/:id', authorize([Role.ADMIN]), EmployeeController.update);
router.delete('/:id', authorize([Role.ADMIN]), EmployeeController.delete);

export default router;
