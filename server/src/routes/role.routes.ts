import { Router } from 'express';
import { RoleController } from '../controllers/role.controller.js';

import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', RoleController.getAll);
router.post('/', RoleController.create);
router.put('/:id', RoleController.update);
router.delete('/:id', RoleController.delete);

export default router;
