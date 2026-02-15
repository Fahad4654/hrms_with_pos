import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', CategoryController.getAll);
router.post('/', authorizePermission(['categories']), CategoryController.create);
router.put('/:id', authorizePermission(['categories']), CategoryController.update);
router.delete('/:id', authorizePermission(['categories']), CategoryController.delete);

export default router;
