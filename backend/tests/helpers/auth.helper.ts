import jwt from 'jsonwebtoken';

interface TestTokenPayload {
  userId: string;
  role: 'STUDENT' | 'ADMIN' | 'CONTENT_MANAGER';
  email: string;
}

export function generateTestToken(payload: TestTokenPayload): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    },
    secret
  );
}

export function generateExpiredToken(payload: TestTokenPayload): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      iat: Math.floor(Date.now() / 1000) - (60 * 60 * 25), // 25 hours ago
      exp: Math.floor(Date.now() / 1000) - (60 * 60), // 1 hour ago (expired)
    },
    secret
  );
}

export function generateInvalidToken(): string {
  return jwt.sign(
    { userId: 'test', role: 'STUDENT' },
    'wrong-secret-key'
  );
}

export const TEST_USERS = {
  STUDENT: {
    userId: 'test-student-123',
    role: 'STUDENT' as const,
    email: 'student@test.com',
  },
  ADMIN: {
    userId: 'test-admin-123',
    role: 'ADMIN' as const,
    email: 'admin@test.com',
  },
  CONTENT_MANAGER: {
    userId: 'test-content-manager-123',
    role: 'CONTENT_MANAGER' as const,
    email: 'content@test.com',
  },
} as const;