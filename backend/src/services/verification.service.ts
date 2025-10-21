import crypto from 'crypto';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export class VerificationService {
  static generateToken(): { token: string; tokenHash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  static async createOrReplaceToken(
    userId: string,
    ttlHours: number,
    ip?: string,
    userAgent?: string
  ): Promise<string> {
    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { userId } });
      await tx.emailVerification.create({
        data: { userId, tokenHash, expiresAt, createdIp: ip, createdUserAgent: userAgent },
      });
    });

    return token;
  }

  static async consumeToken(rawToken: string): Promise<{ userId: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });
    if (!record) return null;
    if (record.consumedAt) return null;
    if (record.expiresAt < new Date()) return null;

    await prisma.emailVerification.update({
      where: { tokenHash },
      data: { consumedAt: new Date() },
    });

    return { userId: record.userId };
  }
}


