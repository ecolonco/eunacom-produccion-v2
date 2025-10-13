import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AdminUsersController } from '../controllers/adminUsers.controller';

const router = Router();

// Solo admins
router.use(authenticate, authorize('ADMIN'));

router.get('/users', AdminUsersController.listUsers);
router.put('/users/:id', AdminUsersController.updateUser);

// Gestión de compras de paquetes
router.post('/users/:userId/control-purchases', AdminUsersController.createControlPurchase);
router.put('/users/:userId/control-purchases/:purchaseId', AdminUsersController.updateControlPurchase);
router.post('/users/:userId/exam-purchases', AdminUsersController.createExamPurchase);
router.put('/users/:userId/exam-purchases/:purchaseId', AdminUsersController.updateExamPurchase);
router.post('/users/:userId/mock-exam-purchases', AdminUsersController.createMockExamPurchase);
router.put('/users/:userId/mock-exam-purchases/:purchaseId', AdminUsersController.updateMockExamPurchase);

// Listar paquetes disponibles
router.get('/control-packages', AdminUsersController.listControlPackages);
router.get('/exam-packages', AdminUsersController.listExamPackages);
router.get('/mock-exam-packages', AdminUsersController.listMockExamPackages);

export { router as adminUsersRoutes };


