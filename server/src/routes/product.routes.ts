import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
import { createUploadMiddleware } from '../middleware/upload.js';
const router = Router();

router.use(authenticate);

router.get('/', ProductController.getAll);
router.post('/', authorizePermission(['inventory', 'categories']), ProductController.create);
router.post('/bulk', authorizePermission(['inventory', 'categories']), ProductController.bulkCreate);
const productUpload = createUploadMiddleware('products');
router.post('/upload-image', authorizePermission(['inventory', 'categories']), productUpload.single('image'), ProductController.uploadImage);
router.patch('/:id/inventory', authorizePermission(['inventory', 'pos']), ProductController.updateStock);
router.put('/:id', authorizePermission(['inventory']), ProductController.update);
router.delete('/:id', authorizePermission(['inventory']), ProductController.delete);

export default router;
