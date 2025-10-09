import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AdminUsersController } from '../controllers/adminUsers.controller';

const router = Router();

// Solo admins
router.use(authenticate, authorize('ADMIN'));

router.get('/users', AdminUsersController.listUsers);
router.put('/users/:id', AdminUsersController.updateUser);

export { router as adminUsersRoutes };


