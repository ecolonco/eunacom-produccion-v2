import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// DELETE /api/cleanup/all-exercises - Delete all exercises (ADMIN only)
router.delete('/all-exercises', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden eliminar ejercicios'
      });
    }

    // Delete from questions table (where current exercises are)
    const deletedQuestions = await prisma.question.deleteMany({});
    
    // Also try to delete from other possible tables
    let deletedBaseQuestions = 0;
    try {
      deletedBaseQuestions = (await prisma.baseQuestion.deleteMany({})).count;
    } catch (error) {
      // Table might not exist, ignore error
    }

    return res.status(200).json({
      success: true,
      message: 'Todos los ejercicios han sido eliminados',
      deleted: {
        questions: deletedQuestions.count,
        baseQuestions: deletedBaseQuestions
      }
    });

  } catch (error: any) {
    console.error('Error deleting exercises:', error);
    return res.status(500).json({
      success: false,
      message: `Error al eliminar ejercicios: ${error.message}`
    });
  }
});

export default router;
