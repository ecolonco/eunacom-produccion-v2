import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid user'
      });
    }

    // Add user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid token'
    });
  }
};

// Authorization middleware for specific roles
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication (user is not required)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};