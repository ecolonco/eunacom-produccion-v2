import { Router } from 'express';
import { CreditsController } from '../controllers/credits.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/credits/balance - Obtener balance de créditos
router.get('/balance', CreditsController.getBalance);

// POST /api/credits/check - Verificar si tiene suficientes créditos
router.post('/check', CreditsController.checkCredits);

// POST /api/credits/deduct - Descontar créditos
router.post('/deduct', CreditsController.deductCredits);

// GET /api/credits/transactions - Obtener historial de transacciones
router.get('/transactions', CreditsController.getTransactions);

// GET /api/credits/packages - Obtener paquetes disponibles
router.get('/packages', CreditsController.getPackages);

// POST /api/credits/add - Añadir créditos (Admin only)
router.post('/add', authorize('ADMIN'), CreditsController.addCredits);

export { router as creditsRoutes };

