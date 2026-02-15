import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';

const router = Router();

router.get('/', CategoryController.getAll);
router.post('/', CategoryController.create);
router.put('/:id', CategoryController.update);
router.delete('/:id', CategoryController.delete);

export default router;
