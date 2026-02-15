import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
const router = Router();

router.use(authenticate);

router.get('/', ProductController.getAll);
router.post('/', authorizePermission(['products']), ProductController.create);
router.patch('/:id/inventory', authorizePermission(['products', 'pos']), ProductController.updateStock);
router.put('/:id', authorizePermission(['products']), ProductController.update);
router.delete('/:id', authorizePermission(['products']), ProductController.delete);

export default router;
