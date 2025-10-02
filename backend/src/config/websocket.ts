import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface Socket {
  id: string;
  userId?: string;
  userRole?: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  disconnect: () => void;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        logger.info(`WebSocket authenticated: User ${socket.userId} (${socket.userRole})`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const { userId, userRole } = socket;

      logger.info(`WebSocket connected: ${socket.id} (User: ${userId})`);

      // Store user connection
      if (userId) {
        this.connectedUsers.set(userId, socket.id);

        // Join user-specific room
        socket.join(`user:${userId}`);

        // Join role-specific room
        if (userRole === 'ADMIN' || userRole === 'CONTENT_MANAGER') {
          socket.join('admin');
        } else {
          socket.join('students');
        }
      }

      // Handle dashboard subscription
      socket.on('subscribe:dashboard', (data: { dashboardType: 'student' | 'admin' }) => {
        const room = `dashboard:${data.dashboardType}`;
        socket.join(room);
        logger.info(`User ${userId} subscribed to ${room}`);
      });

      // Handle unsubscription
      socket.on('unsubscribe:dashboard', (data: { dashboardType: 'student' | 'admin' }) => {
        const room = `dashboard:${data.dashboardType}`;
        socket.leave(room);
        logger.info(`User ${userId} unsubscribed from ${room}`);
      });

      // Handle user metrics subscription
      socket.on('subscribe:user-metrics', () => {
        if (userId) {
          socket.join(`metrics:user:${userId}`);
          logger.info(`User ${userId} subscribed to personal metrics`);
        }
      });

      // Handle admin metrics subscription
      socket.on('subscribe:admin-metrics', () => {
        if (userRole === 'ADMIN' || userRole === 'CONTENT_MANAGER') {
          socket.join('metrics:admin');
          logger.info(`Admin ${userId} subscribed to admin metrics`);
        } else {
          socket.emit('error', { message: 'Unauthorized for admin metrics' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
        if (userId) {
          this.connectedUsers.delete(userId);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`WebSocket error for ${socket.id}:`, error);
      });
    });
  }

  // Broadcast methods for dashboard updates

  /**
   * Send user-specific metrics update
   */
  public sendUserMetricsUpdate(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('metrics:user:updated', data);
    this.io.to(`metrics:user:${userId}`).emit('metrics:user:updated', data);
  }

  /**
   * Send user progress update
   */
  public sendUserProgressUpdate(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('progress:updated', data);
  }

  /**
   * Send new study recommendation
   */
  public sendStudyRecommendation(userId: string, recommendation: any): void {
    this.io.to(`user:${userId}`).emit('recommendation:new', recommendation);
  }

  /**
   * Broadcast admin metrics update
   */
  public broadcastAdminMetricsUpdate(data: any): void {
    this.io.to('admin').emit('metrics:admin:updated', data);
    this.io.to('metrics:admin').emit('metrics:admin:updated', data);
  }

  /**
   * Send platform health update
   */
  public sendSystemHealthUpdate(data: any): void {
    this.io.to('admin').emit('system:health:updated', data);
  }

  /**
   * Send content analytics update
   */
  public sendContentAnalyticsUpdate(data: any): void {
    this.io.to('admin').emit('content:analytics:updated', data);
  }

  /**
   * Send user activity update to admins
   */
  public sendUserActivityUpdate(data: any): void {
    this.io.to('admin').emit('user:activity:updated', data);
  }

  /**
   * Send real-time notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
  }): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Broadcast notification to all admin users
   */
  public broadcastNotificationToAdmins(notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
  }): void {
    this.io.to('admin').emit('notification', notification);
  }

  /**
   * Broadcast notification to all students
   */
  public broadcastNotificationToStudents(notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
  }): void {
    this.io.to('students').emit('notification', notification);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users by role
   */
  public async getConnectedUsersByRole(): Promise<{
    total: number;
    admins: number;
    students: number;
  }> {
    const adminSockets = await this.io.in('admin').fetchSockets();
    const studentSockets = await this.io.in('students').fetchSockets();

    return {
      total: this.connectedUsers.size,
      admins: adminSockets.length,
      students: studentSockets.length,
    };
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Disconnect user
   */
  public disconnectUser(userId: string): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }

  /**
   * Get IO instance for custom usage
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
    logger.info('WebSocket server initialized');
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

// Event types for type safety
export interface DashboardEvents {
  'metrics:user:updated': any;
  'metrics:admin:updated': any;
  'progress:updated': any;
  'recommendation:new': any;
  'system:health:updated': any;
  'content:analytics:updated': any;
  'user:activity:updated': any;
  'notification': {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
  };
}