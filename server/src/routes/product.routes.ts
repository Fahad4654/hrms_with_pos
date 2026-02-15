import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.get('/', ProductController.getAll);
router.post('/', authorize(['ADMIN', 'MANAGER']), ProductController.create);
router.patch('/:id/inventory', authorize(['ADMIN', 'MANAGER', 'STAFF']), ProductController.updateStock);
router.put('/:id', authorize(['ADMIN', 'MANAGER']), ProductController.update);
router.delete('/:id', authorize(['ADMIN']), ProductController.delete);

export default router;
