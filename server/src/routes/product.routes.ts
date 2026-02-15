import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', ProductController.getAll);
router.post('/', authorize([Role.ADMIN, Role.MANAGER]), ProductController.create);
router.patch('/:id/inventory', authorize([Role.ADMIN, Role.MANAGER, Role.STAFF]), ProductController.updateStock);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER]), ProductController.update);
router.delete('/:id', authorize([Role.ADMIN]), ProductController.delete);

export default router;
