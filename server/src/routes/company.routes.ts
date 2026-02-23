import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', CompanyController.getAll);
router.post('/', authorizePermission(['inventory']), CompanyController.create);
router.put('/:id', authorizePermission(['inventory']), CompanyController.update);
router.delete('/:id', authorizePermission(['inventory']), CompanyController.delete);

export default router;
