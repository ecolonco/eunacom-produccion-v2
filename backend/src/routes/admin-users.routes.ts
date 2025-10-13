import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AdminUsersController } from '../controllers/adminUsers.controller';

const router = Router();

// Solo admins
router.use(authenticate, authorize('ADMIN'));

router.get('/users', AdminUsersController.listUsers);
router.put('/users/:id', AdminUsersController.updateUser);
router.put('/users/:userId/control-purchases/:purchaseId', AdminUsersController.updateControlPurchase);
router.put('/users/:userId/exam-purchases/:purchaseId', AdminUsersController.updateExamPurchase);
router.put('/users/:userId/mock-exam-purchases/:purchaseId', AdminUsersController.updateMockExamPurchase);

export { router as adminUsersRoutes };


