import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/search', CustomerController.search);

export default router;
