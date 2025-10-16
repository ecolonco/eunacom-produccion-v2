/**
 * Rutas de administración para Topics y porcentajes de ensayos EUNACOM
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AdminTopicsController } from '../controllers/adminTopics.controller';

const router = Router();

// Solo admins
router.use(authenticate, authorize('ADMIN'));

// Listar todos los topics con sus porcentajes y cantidad de preguntas
router.get('/topics/mock-exam-percentages', AdminTopicsController.listTopicsWithPercentages);

// Actualizar el porcentaje de un topic específico
router.put('/topics/:id/mock-exam-percentage', AdminTopicsController.updateTopicPercentage);

// Actualizar múltiples porcentajes a la vez
router.put('/topics/bulk-mock-exam-percentages', AdminTopicsController.bulkUpdatePercentages);

export { router as adminTopicsRoutes };
