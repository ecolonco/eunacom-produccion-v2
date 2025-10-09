import { Request, Response } from 'express';
import { CreditsService, PackageType } from '../services/credits.service';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export class CreditsController {
  /**
   * GET /api/credits/balance
   * Obtiene el balance de créditos del usuario actual
   */
  static async getBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      const credits = await CreditsService.getUserCredits(userId);

      res.json({
        success: true,
        data: {
          credits,
          userId
        }
      });
    } catch (error) {
      logger.error('Error getting balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener balance de créditos'
      });
    }
  }

  /**
   * POST /api/credits/check
   * Verifica si el usuario tiene suficientes créditos para un paquete
   */
  static async checkCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { packageType } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      if (!packageType || !(packageType in CreditsService.getAvailablePackages())) {
        res.status(400).json({
          success: false,
          message: 'Tipo de paquete inválido'
        });
        return;
      }

      const hasEnough = await CreditsService.hasEnoughCredits(userId, packageType as PackageType);
      const currentCredits = await CreditsService.getUserCredits(userId);
      const packageInfo = CreditsService.getPackageInfo(packageType as PackageType);

      res.json({
        success: true,
        data: {
          hasEnoughCredits: hasEnough,
          currentCredits,
          requiredCredits: packageInfo.cost,
          packageInfo
        }
      });
    } catch (error) {
      logger.error('Error checking credits:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar créditos'
      });
    }
  }

  /**
   * POST /api/credits/deduct
   * Descuenta créditos del usuario para un paquete
   */
  static async deductCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { packageType, metadata } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      if (!packageType) {
        res.status(400).json({
          success: false,
          message: 'Tipo de paquete requerido'
        });
        return;
      }

      // Verificar que el paquete existe
      if (!(packageType in CreditsService.getAvailablePackages())) {
        res.status(400).json({
          success: false,
          message: 'Tipo de paquete inválido'
        });
        return;
      }

      const result = await CreditsService.deductCredits(
        userId,
        packageType as PackageType,
        metadata
      );

      res.json({
        success: true,
        message: 'Créditos descontados exitosamente',
        data: {
          newBalance: result.newBalance,
          transactionId: result.transaction.id
        }
      });
    } catch (error: any) {
      logger.error('Error deducting credits:', error);

      if (error.message === 'Créditos insuficientes') {
        res.status(400).json({
          success: false,
          message: 'No tienes suficientes créditos para esta acción',
          code: 'INSUFFICIENT_CREDITS'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error al descontar créditos'
      });
    }
  }

  /**
   * GET /api/credits/transactions
   * Obtiene el historial de transacciones del usuario
   */
  static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      const result = await CreditsService.getUserTransactions(userId, limit, offset);

      res.json({
        success: true,
        data: {
          transactions: result.transactions,
          total: result.total,
          limit,
          offset
        }
      });
    } catch (error) {
      logger.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial de transacciones'
      });
    }
  }

  /**
   * GET /api/credits/packages
   * Obtiene información de todos los paquetes disponibles
   */
  static async getPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const packages = CreditsService.getAvailablePackages();
      
      // Calcular ahorros para cada paquete
      const packagesWithSavings = packages.map(pkg => ({
        ...pkg,
        savings: CreditsService.calculateSavings(pkg.type as PackageType),
        savingsPercent: Math.round(
          (CreditsService.calculateSavings(pkg.type as PackageType) / (pkg.exercises * 1)) * 100
        )
      }));

      res.json({
        success: true,
        data: {
          packages: packagesWithSavings
        }
      });
    } catch (error) {
      logger.error('Error getting packages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener paquetes'
      });
    }
  }

  /**
   * POST /api/credits/add (Admin only)
   * Añade créditos a un usuario
   */
  static async addCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { targetUserId, amount, type, description, metadata } = req.body;
      const adminUserId = req.user?.id;
      const userRole = req.user?.role;

      if (!adminUserId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      // Solo admins pueden añadir créditos
      if (userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
        return;
      }

      if (!targetUserId || !amount || !type || !description) {
        res.status(400).json({
          success: false,
          message: 'Faltan parámetros requeridos: targetUserId, amount, type, description'
        });
        return;
      }

      if (!['PURCHASE', 'BONUS', 'ADMIN_ADJUSTMENT'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Tipo de transacción inválido'
        });
        return;
      }

      const result = await CreditsService.addCredits(
        targetUserId,
        amount,
        type,
        description,
        { ...metadata, addedBy: adminUserId }
      );

      res.json({
        success: true,
        message: 'Créditos añadidos exitosamente',
        data: {
          newBalance: result.newBalance,
          transactionId: result.transaction.id
        }
      });
    } catch (error) {
      logger.error('Error adding credits:', error);
      res.status(500).json({
        success: false,
        message: 'Error al añadir créditos'
      });
    }
  }
}

