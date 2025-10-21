import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class AdminUsersController {
  // GET /api/admin/users
  static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 200);
      const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
      const search = ((req.query.search as string) || '').trim();

      const where: any = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            credits: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            controlPurchases: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                controlsTotal: true,
                controlsUsed: true,
                package: {
                  select: {
                    name: true,
                  }
                }
              }
            },
            examPurchases: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                examsTotal: true,
                examsUsed: true,
                package: {
                  select: {
                    name: true,
                  }
                }
              }
            },
            mockExamPurchases: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                mockExamsTotal: true,
                mockExamsUsed: true,
                package: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      logger.error('Error listing users:', error);
      res.status(500).json({ success: false, message: 'Error al listar usuarios' });
    }
  }

  // PUT /api/admin/users/:id
  static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, username, password, credits, isActive, isVerified } = req.body as {
        email?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        password?: string;
        credits?: number;
        isActive?: boolean;
        isVerified?: boolean;
      };

      const data: any = {};
      if (typeof email === 'string') data.email = email.trim();
      if (typeof firstName === 'string') data.firstName = firstName.trim();
      if (typeof lastName === 'string') data.lastName = lastName.trim();
      if (typeof username === 'string') data.username = username.trim();
      if (typeof credits === 'number' && Number.isFinite(credits)) data.credits = Math.max(0, Math.floor(credits));
      if (typeof password === 'string' && password.length >= 6) {
        data.passwordHash = await bcrypt.hash(password, 12);
      }
      if (typeof isActive === 'boolean') data.isActive = isActive;
      if (typeof isVerified === 'boolean') data.isVerified = isVerified;

      if (Object.keys(data).length === 0) {
        res.status(400).json({ success: false, message: 'Sin cambios para actualizar' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          credits: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      });

      res.json({ success: true, data: { user: { ...updated, createdAt: updated.createdAt.toISOString() } } });
    } catch (error: any) {
      logger.error('Error updating user:', error);
      if (error?.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Email o username ya están en uso' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
  }

  // PUT /api/admin/users/:userId/control-purchases/:purchaseId
  static async updateControlPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, purchaseId } = req.params;
      const { controlsUsed } = req.body;

      if (typeof controlsUsed !== 'number' || !Number.isFinite(controlsUsed)) {
        res.status(400).json({ success: false, message: 'controlsUsed debe ser un número' });
        return;
      }

      const purchase = await prisma.controlPurchase.findFirst({
        where: { id: purchaseId, userId }
      });

      if (!purchase) {
        res.status(404).json({ success: false, message: 'Compra no encontrada' });
        return;
      }

      const updated = await prisma.controlPurchase.update({
        where: { id: purchaseId },
        data: { controlsUsed: Math.max(0, Math.min(controlsUsed, purchase.controlsTotal)) }
      });

      res.json({ success: true, data: { purchase: updated } });
    } catch (error) {
      logger.error('Error updating control purchase:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar compra' });
    }
  }

  // PUT /api/admin/users/:userId/exam-purchases/:purchaseId
  static async updateExamPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, purchaseId } = req.params;
      const { examsUsed } = req.body;

      if (typeof examsUsed !== 'number' || !Number.isFinite(examsUsed)) {
        res.status(400).json({ success: false, message: 'examsUsed debe ser un número' });
        return;
      }

      const purchase = await prisma.examPurchase.findFirst({
        where: { id: purchaseId, userId }
      });

      if (!purchase) {
        res.status(404).json({ success: false, message: 'Compra no encontrada' });
        return;
      }

      const updated = await prisma.examPurchase.update({
        where: { id: purchaseId },
        data: { examsUsed: Math.max(0, Math.min(examsUsed, purchase.examsTotal)) }
      });

      res.json({ success: true, data: { purchase: updated } });
    } catch (error) {
      logger.error('Error updating exam purchase:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar compra' });
    }
  }

  // PUT /api/admin/users/:userId/mock-exam-purchases/:purchaseId
  static async updateMockExamPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, purchaseId } = req.params;
      const { mockExamsUsed } = req.body;

      if (typeof mockExamsUsed !== 'number' || !Number.isFinite(mockExamsUsed)) {
        res.status(400).json({ success: false, message: 'mockExamsUsed debe ser un número' });
        return;
      }

      const purchase = await prisma.mockExamPurchase.findFirst({
        where: { id: purchaseId, userId }
      });

      if (!purchase) {
        res.status(404).json({ success: false, message: 'Compra no encontrada' });
        return;
      }

      const updated = await prisma.mockExamPurchase.update({
        where: { id: purchaseId },
        data: { mockExamsUsed: Math.max(0, Math.min(mockExamsUsed, purchase.mockExamsTotal)) }
      });

      res.json({ success: true, data: { purchase: updated } });
    } catch (error) {
      logger.error('Error updating mock exam purchase:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar compra' });
    }
  }

  // POST /api/admin/users/:userId/control-purchases
  static async createControlPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { packageId } = req.body;

      if (!packageId) {
        res.status(400).json({ success: false, message: 'packageId requerido' });
        return;
      }

      const controlPackage = await prisma.controlPackage.findUnique({
        where: { id: packageId }
      });

      if (!controlPackage) {
        res.status(404).json({ success: false, message: 'Paquete no encontrado' });
        return;
      }

      const purchase = await prisma.controlPurchase.create({
        data: {
          userId,
          packageId,
          controlsTotal: controlPackage.controlQty,
          controlsUsed: 0,
          status: 'ACTIVE'
        },
        include: {
          package: {
            select: { name: true }
          }
        }
      });

      res.json({ success: true, data: { purchase } });
    } catch (error) {
      logger.error('Error creating control purchase:', error);
      res.status(500).json({ success: false, message: 'Error al crear compra' });
    }
  }

  // POST /api/admin/users/:userId/exam-purchases
  static async createExamPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { packageId } = req.body;

      if (!packageId) {
        res.status(400).json({ success: false, message: 'packageId requerido' });
        return;
      }

      const examPackage = await prisma.examPackage.findUnique({
        where: { id: packageId }
      });

      if (!examPackage) {
        res.status(404).json({ success: false, message: 'Paquete no encontrado' });
        return;
      }

      const purchase = await prisma.examPurchase.create({
        data: {
          userId,
          packageId,
          examsTotal: examPackage.examQty,
          examsUsed: 0,
          status: 'ACTIVE'
        },
        include: {
          package: {
            select: { name: true }
          }
        }
      });

      res.json({ success: true, data: { purchase } });
    } catch (error) {
      logger.error('Error creating exam purchase:', error);
      res.status(500).json({ success: false, message: 'Error al crear compra' });
    }
  }

  // POST /api/admin/users/:userId/mock-exam-purchases
  static async createMockExamPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { packageId } = req.body;

      if (!packageId) {
        res.status(400).json({ success: false, message: 'packageId requerido' });
        return;
      }

      const mockExamPackage = await prisma.mockExamPackage.findUnique({
        where: { id: packageId }
      });

      if (!mockExamPackage) {
        res.status(404).json({ success: false, message: 'Paquete no encontrado' });
        return;
      }

      const purchase = await prisma.mockExamPurchase.create({
        data: {
          userId,
          packageId,
          mockExamsTotal: mockExamPackage.mockExamQty,
          mockExamsUsed: 0,
          status: 'ACTIVE'
        },
        include: {
          package: {
            select: { name: true }
          }
        }
      });

      res.json({ success: true, data: { purchase } });
    } catch (error) {
      logger.error('Error creating mock exam purchase:', error);
      res.status(500).json({ success: false, message: 'Error al crear compra' });
    }
  }

  // GET /api/admin/control-packages
  static async listControlPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const packages = await prisma.controlPackage.findMany({
        where: { isActive: true },
        orderBy: { controlQty: 'asc' }
      });
      res.json({ success: true, data: { packages } });
    } catch (error) {
      logger.error('Error listing control packages:', error);
      res.status(500).json({ success: false, message: 'Error al listar paquetes' });
    }
  }

  // GET /api/admin/exam-packages
  static async listExamPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const packages = await prisma.examPackage.findMany({
        where: { isActive: true },
        orderBy: { examQty: 'asc' }
      });
      res.json({ success: true, data: { packages } });
    } catch (error) {
      logger.error('Error listing exam packages:', error);
      res.status(500).json({ success: false, message: 'Error al listar paquetes' });
    }
  }

  // GET /api/admin/mock-exam-packages
  static async listMockExamPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const packages = await prisma.mockExamPackage.findMany({
        where: { isActive: true },
        orderBy: { mockExamQty: 'asc' }
      });
      res.json({ success: true, data: { packages } });
    } catch (error) {
      logger.error('Error listing mock exam packages:', error);
      res.status(500).json({ success: false, message: 'Error al listar paquetes' });
    }
  }

  // POST /api/admin/users/:id/toggle-active
  static async toggleUserActive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get current user state
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          role: true
        }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      // Prevent deactivating admin users
      if (user.role === 'ADMIN' && user.isActive) {
        res.status(403).json({
          success: false,
          message: 'No se puede desactivar un usuario administrador'
        });
        return;
      }

      // Toggle isActive
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isVerified: true,
          role: true,
          credits: true,
          createdAt: true
        }
      });

      const action = updated.isActive ? 'activado' : 'desactivado';
      logger.info(`User ${action}:`, { userId: id, email: user.email, isActive: updated.isActive });

      res.json({
        success: true,
        message: `Usuario ${action} correctamente`,
        data: { user: { ...updated, createdAt: updated.createdAt.toISOString() } }
      });
    } catch (error) {
      logger.error('Error toggling user active status:', error);
      res.status(500).json({ success: false, message: 'Error al cambiar estado del usuario' });
    }
  }
}


