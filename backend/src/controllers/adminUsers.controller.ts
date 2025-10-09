import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

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
}


