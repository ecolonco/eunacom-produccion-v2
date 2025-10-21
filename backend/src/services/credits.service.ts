import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreditPackage {
  type: string;
  cost: number;
  exercises: number;
  description: string;
}

export const CREDIT_PACKAGES = {
  SINGLE_RANDOM: {
    type: 'SINGLE_RANDOM',
    cost: 1,
    exercises: 1,
    description: 'Ejercicio aleatorio individual'
  },
  SINGLE_SPECIALTY: {
    type: 'SINGLE_SPECIALTY',
    cost: 1,
    exercises: 1,
    description: 'Ejercicio por especialidad'
  },
  PACK_20: {
    type: 'PACK_20',
    cost: 15,
    exercises: 20,
    description: 'Paquete de 20 ejercicios aleatorios'
  },
  PACK_90: {
    type: 'PACK_90',
    cost: 60,
    exercises: 90,
    description: 'Paquete de 90 ejercicios aleatorios'
  }
} as const;

export type PackageType = keyof typeof CREDIT_PACKAGES;

export class CreditsService {
  /**
   * Obtiene el balance actual de créditos de un usuario
   */
  static async getUserCredits(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user.credits;
    } catch (error) {
      logger.error('Error getting user credits:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario tiene suficientes créditos para un paquete
   */
  static async hasEnoughCredits(userId: string, packageType: PackageType): Promise<boolean> {
    try {
      const currentCredits = await this.getUserCredits(userId);
      const packageCost = CREDIT_PACKAGES[packageType].cost;

      return currentCredits >= packageCost;
    } catch (error) {
      logger.error('Error checking credits:', error);
      return false;
    }
  }

  /**
   * Descuenta créditos de un usuario y registra la transacción
   */
  static async deductCredits(
    userId: string,
    packageType: PackageType,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    newBalance: number;
    transaction: any;
  }> {
    try {
      const package_ = CREDIT_PACKAGES[packageType];

      // Usar una transacción de base de datos para garantizar consistencia
      const result = await prisma.$transaction(async (tx) => {
        // Obtener usuario con lock para evitar race conditions
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true, id: true }
        });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        // Verificar si tiene suficientes créditos
        if (user.credits < package_.cost) {
          throw new Error('Créditos insuficientes');
        }

        const balanceBefore = user.credits;
        const balanceAfter = user.credits - package_.cost;

        // Actualizar créditos del usuario
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { credits: balanceAfter }
        });

        // Registrar la transacción
        const transaction = await tx.creditTransaction.create({
          data: {
            userId,
            amount: -package_.cost,
            type: 'DEDUCTION',
            packageType: package_.type,
            description: `Deducción: ${package_.description}`,
            balanceBefore,
            balanceAfter,
            metadata: metadata || {}
          }
        });

        return {
          success: true,
          newBalance: balanceAfter,
          transaction
        };
      });

      logger.info(`Credits deducted successfully for user ${userId}`, {
        packageType,
        cost: package_.cost,
        newBalance: result.newBalance
      });

      return result;
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Añade créditos a un usuario (compra, bono, ajuste admin)
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: 'PURCHASE' | 'BONUS' | 'ADMIN_ADJUSTMENT',
    description: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    newBalance: number;
    transaction: any;
  }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true }
        });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        const balanceBefore = user.credits;
        const balanceAfter = user.credits + amount;

        // Actualizar créditos
        await tx.user.update({
          where: { id: userId },
          data: { credits: balanceAfter }
        });

        // Registrar transacción
        const transaction = await tx.creditTransaction.create({
          data: {
            userId,
            amount,
            type,
            description,
            balanceBefore,
            balanceAfter,
            metadata: metadata || {}
          }
        });

        return {
          success: true,
          newBalance: balanceAfter,
          transaction
        };
      });

      logger.info(`Credits added successfully for user ${userId}`, {
        amount,
        type,
        newBalance: result.newBalance
      });

      return result;
    } catch (error) {
      logger.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de transacciones de créditos de un usuario
   */
  static async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    transactions: any[];
    total: number;
  }> {
    try {
      const [transactions, total] = await Promise.all([
        prisma.creditTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.creditTransaction.count({
          where: { userId }
        })
      ]);

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de todos los paquetes disponibles
   */
  static getAvailablePackages(): CreditPackage[] {
    return Object.values(CREDIT_PACKAGES);
  }

  /**
   * Obtiene información de un paquete específico
   */
  static getPackageInfo(packageType: PackageType): CreditPackage {
    return CREDIT_PACKAGES[packageType];
  }

  /**
   * Calcula el ahorro de un paquete vs ejercicios individuales
   */
  static calculateSavings(packageType: PackageType): number {
    const package_ = CREDIT_PACKAGES[packageType];
    const individualCost = package_.exercises * 1; // 1 crédito por ejercicio
    return individualCost - package_.cost;
  }
}

