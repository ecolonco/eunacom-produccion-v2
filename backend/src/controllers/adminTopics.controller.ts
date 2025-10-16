/**
 * Controlador para gestión de porcentajes de ensayos EUNACOM en Topics
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class AdminTopicsController {
  /**
   * GET /api/admin/topics/mock-exam-percentages
   * Lista todos los topics con sus porcentajes y cantidad de preguntas disponibles
   */
  static async listTopicsWithPercentages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Obtener todos los topics con su información de especialidad y preguntas
      const topics = await prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          specialtyId: true,
          mockExamPercentage: true,
          createdAt: true,
          updatedAt: true,
          specialty: {
            select: {
              id: true,
              name: true,
            },
          },
          questions: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: [
          { specialty: { name: 'asc' } },
          { name: 'asc' },
        ],
      });

      // Formatear la respuesta
      const formattedTopics = topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        specialtyId: topic.specialtyId,
        specialtyName: topic.specialty?.name || null,
        mockExamPercentage: topic.mockExamPercentage,
        questionCount: topic.questions.length,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      }));

      // Calcular suma total de porcentajes
      const totalPercentage = formattedTopics.reduce((sum, topic) => {
        return sum + (topic.mockExamPercentage || 0);
      }, 0);

      // Calcular cuántos topics tienen porcentaje asignado
      const topicsWithPercentage = formattedTopics.filter((t) => t.mockExamPercentage !== null).length;

      res.json({
        success: true,
        topics: formattedTopics,
        summary: {
          total: formattedTopics.length,
          withPercentage: topicsWithPercentage,
          totalPercentage: parseFloat(totalPercentage.toFixed(2)),
          isValid: Math.abs(totalPercentage - 100) < 0.5,
        },
      });
    } catch (error) {
      logger.error('Error listing topics with percentages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los topics',
      });
    }
  }

  /**
   * PUT /api/admin/topics/:id/mock-exam-percentage
   * Actualiza el porcentaje de un topic específico
   */
  static async updateTopicPercentage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { mockExamPercentage } = req.body;

      // Validar que el porcentaje sea un número válido
      if (mockExamPercentage !== null && mockExamPercentage !== undefined) {
        const percentage = parseFloat(mockExamPercentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          res.status(400).json({
            success: false,
            message: 'El porcentaje debe ser un número entre 0 y 100',
          });
          return;
        }
      }

      // Verificar que el topic existe
      const topic = await prisma.topic.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });

      if (!topic) {
        res.status(404).json({
          success: false,
          message: 'Topic no encontrado',
        });
        return;
      }

      // Actualizar el porcentaje
      const updated = await prisma.topic.update({
        where: { id },
        data: {
          mockExamPercentage: mockExamPercentage !== null ? parseFloat(mockExamPercentage) : null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          specialtyId: true,
          mockExamPercentage: true,
          specialty: {
            select: {
              name: true,
            },
          },
        },
      });

      logger.info(`Topic percentage updated: ${topic.name} -> ${mockExamPercentage}%`);

      res.json({
        success: true,
        message: 'Porcentaje actualizado correctamente',
        topic: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          specialtyId: updated.specialtyId,
          specialtyName: updated.specialty?.name || null,
          mockExamPercentage: updated.mockExamPercentage,
        },
      });
    } catch (error) {
      logger.error('Error updating topic percentage:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el porcentaje',
      });
    }
  }

  /**
   * PUT /api/admin/topics/bulk-mock-exam-percentages
   * Actualiza múltiples porcentajes a la vez
   */
  static async bulkUpdatePercentages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { updates } = req.body;

      // Validar formato
      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Se requiere un array de updates con formato { id, mockExamPercentage }',
        });
        return;
      }

      // Validar cada update
      for (const update of updates) {
        if (!update.id || typeof update.id !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Cada update debe tener un id válido',
          });
          return;
        }

        if (update.mockExamPercentage !== null && update.mockExamPercentage !== undefined) {
          const percentage = parseFloat(update.mockExamPercentage);
          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            res.status(400).json({
              success: false,
              message: `El porcentaje para el topic ${update.id} debe ser un número entre 0 y 100`,
            });
            return;
          }
        }
      }

      // Ejecutar updates en transacción
      const results = await prisma.$transaction(
        updates.map((update: any) =>
          prisma.topic.update({
            where: { id: update.id },
            data: {
              mockExamPercentage:
                update.mockExamPercentage !== null ? parseFloat(update.mockExamPercentage) : null,
            },
          })
        )
      );

      logger.info(`Bulk update of ${updates.length} topic percentages completed`);

      res.json({
        success: true,
        message: `${results.length} porcentajes actualizados correctamente`,
        count: results.length,
      });
    } catch (error: any) {
      logger.error('Error in bulk update of topic percentages:', error);

      // Si es un error de "registro no encontrado"
      if (error?.code === 'P2025') {
        res.status(404).json({
          success: false,
          message: 'Uno o más topics no fueron encontrados',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error al actualizar los porcentajes',
      });
    }
  }
}
