import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/taxonomy-admin/specialties - Get all specialties with topics
router.get('/specialties', authenticate, async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all specialties for admin management');

    const specialties = await prisma.specialty.findMany({
      include: {
        topics: {
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        parent: true,
        children: {
          include: {
            topics: {
              include: {
                _count: {
                  select: {
                    questions: true
                  }
                }
              },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            questions: true,
            topics: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    logger.info('Specialties fetched successfully', { count: specialties.length });

    res.json({
      success: true,
      data: specialties
    });

  } catch (error) {
    logger.error('Error fetching specialties:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/taxonomy-admin/specialties - Create new specialty
router.post('/specialties', 
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional(),
    body('code').optional(),
    body('parentId').optional().isString()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { name, description, code, parentId } = req.body;

      // Check if specialty name already exists
      const existingSpecialty = await prisma.specialty.findUnique({
        where: { name }
      });

      if (existingSpecialty) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una especialidad con ese nombre'
        });
      }

      // If code is provided, check if it's unique
      if (code) {
        const existingCode = await prisma.specialty.findUnique({
          where: { code }
        });

        if (existingCode) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe una especialidad con ese código'
          });
        }
      }

      // If parentId is provided, verify it exists
      if (parentId) {
        const parentSpecialty = await prisma.specialty.findUnique({
          where: { id: parentId }
        });

        if (!parentSpecialty) {
          return res.status(400).json({
            success: false,
            message: 'La especialidad padre no existe'
          });
        }
      }

      const specialty = await prisma.specialty.create({
        data: {
          name,
          description,
          code,
          parentId
        },
        include: {
          parent: true,
          _count: {
            select: {
              questions: true,
              topics: true
            }
          }
        }
      });

      logger.info('Specialty created successfully', { 
        specialtyId: specialty.id, 
        name: specialty.name,
        createdBy: req.user?.id 
      });

      res.status(201).json({
        success: true,
        data: specialty,
        message: 'Especialidad creada exitosamente'
      });

    } catch (error) {
      logger.error('Error creating specialty:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// PUT /api/taxonomy-admin/specialties/:id - Update specialty
router.put('/specialties/:id',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional(),
    body('code').optional(),
    body('parentId').optional().isString(),
    body('isActive').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { name, description, code, parentId, isActive } = req.body;

      // Check if specialty exists
      const existingSpecialty = await prisma.specialty.findUnique({
        where: { id }
      });

      if (!existingSpecialty) {
        return res.status(404).json({
          success: false,
          message: 'Especialidad no encontrada'
        });
      }

      // Check if name is taken by another specialty
      const nameConflict = await prisma.specialty.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra especialidad con ese nombre'
        });
      }

      // Check if code is taken by another specialty (if provided)
      if (code) {
        const codeConflict = await prisma.specialty.findFirst({
          where: {
            code,
            id: { not: id }
          }
        });

        if (codeConflict) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otra especialidad con ese código'
          });
        }
      }

      const updatedSpecialty = await prisma.specialty.update({
        where: { id },
        data: {
          name,
          description,
          code,
          parentId,
          isActive
        },
        include: {
          parent: true,
          _count: {
            select: {
              questions: true,
              topics: true
            }
          }
        }
      });

      logger.info('Specialty updated successfully', { 
        specialtyId: id, 
        name: updatedSpecialty.name,
        updatedBy: req.user?.id 
      });

      res.json({
        success: true,
        data: updatedSpecialty,
        message: 'Especialidad actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error updating specialty:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// GET /api/taxonomy-admin/specialties/:specialtyId/topics - Get topics for specialty
router.get('/specialties/:specialtyId/topics', authenticate, async (req: Request, res: Response) => {
  try {
    const { specialtyId } = req.params;

    const topics = await prisma.topic.findMany({
      where: { specialtyId },
      include: {
        specialty: true,
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: topics
    });

  } catch (error) {
    logger.error('Error fetching topics for specialty:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/taxonomy-admin/topics - Create new topic
router.post('/topics',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional(),
    body('specialtyId').notEmpty().withMessage('Specialty ID is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { name, description, specialtyId } = req.body;

      // Check if specialty exists
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId }
      });

      if (!specialty) {
        return res.status(400).json({
          success: false,
          message: 'La especialidad especificada no existe'
        });
      }

      // Check if topic name already exists for this specialty
      const existingTopic = await prisma.topic.findUnique({
        where: {
          name_specialtyId: {
            name,
            specialtyId
          }
        }
      });

      if (existingTopic) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un tema con ese nombre en esta especialidad'
        });
      }

      const topic = await prisma.topic.create({
        data: {
          name,
          description,
          specialtyId
        },
        include: {
          specialty: true,
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      logger.info('Topic created successfully', { 
        topicId: topic.id, 
        name: topic.name,
        specialtyId,
        createdBy: req.user?.id 
      });

      res.status(201).json({
        success: true,
        data: topic,
        message: 'Tema creado exitosamente'
      });

    } catch (error) {
      logger.error('Error creating topic:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// PUT /api/taxonomy-admin/topics/:id - Update topic
router.put('/topics/:id',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional(),
    body('specialtyId').notEmpty().withMessage('Specialty ID is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { name, description, specialtyId } = req.body;

      // Check if topic exists
      const existingTopic = await prisma.topic.findUnique({
        where: { id }
      });

      if (!existingTopic) {
        return res.status(404).json({
          success: false,
          message: 'Tema no encontrado'
        });
      }

      // Check if specialty exists
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId }
      });

      if (!specialty) {
        return res.status(400).json({
          success: false,
          message: 'La especialidad especificada no existe'
        });
      }

      // Check if name is taken by another topic in the same specialty
      const nameConflict = await prisma.topic.findFirst({
        where: {
          name,
          specialtyId,
          id: { not: id }
        }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro tema con ese nombre en esta especialidad'
        });
      }

      const updatedTopic = await prisma.topic.update({
        where: { id },
        data: {
          name,
          description,
          specialtyId
        },
        include: {
          specialty: true,
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      logger.info('Topic updated successfully', { 
        topicId: id, 
        name: updatedTopic.name,
        updatedBy: req.user?.id 
      });

      res.json({
        success: true,
        data: updatedTopic,
        message: 'Tema actualizado exitosamente'
      });

    } catch (error) {
      logger.error('Error updating topic:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// DELETE /api/taxonomy-admin/topics/:id - Delete topic
router.delete('/topics/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if topic exists
    const existingTopic = await prisma.topic.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            questions: true
          }
        }
      }
    });

    if (!existingTopic) {
      return res.status(404).json({
        success: false,
        message: 'Tema no encontrado'
      });
    }

    // Check if topic has associated questions
    if (existingTopic._count.questions > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el tema porque tiene ${existingTopic._count.questions} pregunta(s) asociada(s)`
      });
    }

    await prisma.topic.delete({
      where: { id }
    });

    logger.info('Topic deleted successfully', { 
      topicId: id, 
      name: existingTopic.name,
      deletedBy: req.user?.id 
    });

    res.json({
      success: true,
      message: 'Tema eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error deleting topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/taxonomy-admin/load-official-taxonomy - Load official EUNACOM taxonomy
router.post('/load-official-taxonomy', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    logger.info('Loading official EUNACOM taxonomy');

    // Read and execute the official taxonomy seed file
    const fs = require('fs');
    const path = require('path');
    
    const seedFilePath = path.join(__dirname, '../../../eunacom_taxonomy_seed.sql');
    
    if (!fs.existsSync(seedFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de taxonomía oficial no encontrado'
      });
    }

    const seedSQL = fs.readFileSync(seedFilePath, 'utf8');
    
    // Execute the SQL commands (split by semicolon and filter out comments/empty lines)
    const commands = seedSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 0);

    let executedCommands = 0;
    let errors = [];

    for (const command of commands) {
      try {
        if (command.toUpperCase().includes('INSERT') || command.toUpperCase().includes('DELETE')) {
          await prisma.$executeRawUnsafe(command + ';');
          executedCommands++;
        }
      } catch (error: any) {
        logger.warn('SQL command failed (may be expected):', error.message);
        errors.push(error.message);
      }
    }

    // Count loaded data
    const specialtiesCount = await prisma.specialty.count();
    const topicsCount = await prisma.topic.count();

    logger.info('Official EUNACOM taxonomy loaded successfully', {
      executedCommands,
      errors: errors.length,
      specialtiesCount,
      topicsCount
    });

    res.json({
      success: true,
      message: 'Taxonomía oficial EUNACOM cargada exitosamente',
      data: {
        executedCommands,
        errors: errors.length,
        specialtiesCount,
        topicsCount
      }
    });

  } catch (error) {
    logger.error('Error loading official EUNACOM taxonomy:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export { router as taxonomyAdminRoutes };
