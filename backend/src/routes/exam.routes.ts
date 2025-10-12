import { Router, Response } from 'express';
import { examService } from '../services/exam.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// RUTAS PÚBLICAS (para ver paquetes)
// ============================================================================

// GET /api/exams/packages - Obtener paquetes de pruebas disponibles
router.get('/packages', async (req, res: Response) => {
  try {
    const packages = await examService.listPackages();
    
    res.json({
      success: true,
      data: packages,
    });
  } catch (error: any) {
    logger.error('Error al obtener paquetes de pruebas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener paquetes',
    });
  }
});

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// GET /api/exams/my-purchases - Obtener mis compras de pruebas
router.get('/my-purchases', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const purchases = await examService.getUserPurchases(userId);
    
    res.json({
      success: true,
      data: purchases,
    });
  } catch (error: any) {
    logger.error('Error al obtener compras de pruebas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener tus compras',
    });
  }
});

// POST /api/exams/start - Iniciar una nueva prueba
router.post('/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { purchaseId } = req.body;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId es requerido',
      });
    }

    console.log(`🚀 Iniciando prueba para usuario ${userId}, compra ${purchaseId}`);

    const exam = await examService.startExam({ userId, purchaseId });

    res.json({
      success: true,
      data: exam,
    });
  } catch (error: any) {
    logger.error('Error al iniciar prueba:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al iniciar la prueba',
    });
  }
});

// GET /api/exams/:id - Obtener una prueba específica
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const exam = await examService.getExam(id, userId);

    res.json({
      success: true,
      data: exam,
    });
  } catch (error: any) {
    logger.error('Error al obtener prueba:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener la prueba',
    });
  }
});

// POST /api/exams/:id/answer - Responder una pregunta
router.post('/:id/answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { variationId, selectedAnswer } = req.body;

    if (!variationId || !selectedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'variationId y selectedAnswer son requeridos',
      });
    }

    const result = await examService.answerQuestion({
      examId: id,
      userId,
      variationId,
      selectedAnswer,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error al guardar respuesta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al guardar la respuesta',
    });
  }
});

// POST /api/exams/:id/complete - Completar la prueba
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const results = await examService.completeExam(id, userId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('Error al completar prueba:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al completar la prueba',
    });
  }
});

// GET /api/exams/:id/results - Ver resultados de una prueba
router.get('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const results = await examService.getExamResults(id, userId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('Error al obtener resultados:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener los resultados',
    });
  }
});

// GET /api/exams - Listar mis pruebas
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const exams = await examService.listUserExams(userId);

    res.json({
      success: true,
      data: exams,
    });
  } catch (error: any) {
    logger.error('Error al listar pruebas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al listar pruebas',
    });
  }
});

export default router;

