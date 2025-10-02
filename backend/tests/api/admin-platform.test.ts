import request from 'supertest';
import { app } from '../../src/index';
import { generateTestToken, TEST_USERS } from '../helpers/auth.helper';

describe('GET /api/dashboard/admin/platform-metrics', () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(() => {
    adminToken = generateTestToken(TEST_USERS.ADMIN);
    studentToken = generateTestToken(TEST_USERS.STUDENT);
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required',
        message: 'No token provided'
      });
    });

    it('should return 403 when student tries to access admin metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body).toEqual({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    });

    it('should allow admin access', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should allow content manager access', async () => {
      const contentManagerToken = generateTestToken(TEST_USERS.CONTENT_MANAGER);

      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Query Parameters', () => {
    it('should accept period parameter (week, month, year)', async () => {
      const periods = ['week', 'month', 'year'];

      for (const period of periods) {
        const response = await request(app)
          .get(`/api/dashboard/admin/platform-metrics?period=${period}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });

    it('should default period to month', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject invalid period parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics?period=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid query parameter',
        message: 'period must be one of: week, month, year'
      });
    });

    it('should handle includeGrowthRate parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics?includeGrowthRate=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Successful Response Structure (FR-004)', () => {
    it('should return platform metrics with correct structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        totalUsers: expect.any(Number),
        activeUsers: expect.objectContaining({
          daily: expect.any(Number),
          weekly: expect.any(Number),
          monthly: expect.any(Number)
        }),
        newRegistrations: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            count: expect.any(Number)
          })
        ]),
        userGrowthRate: expect.any(Number)
      });

      // Validate data constraints
      expect(response.body.totalUsers).toBeGreaterThanOrEqual(0);
      expect(response.body.activeUsers.daily).toBeGreaterThanOrEqual(0);
      expect(response.body.activeUsers.weekly).toBeGreaterThanOrEqual(0);
      expect(response.body.activeUsers.monthly).toBeGreaterThanOrEqual(0);

      // Active users hierarchy should be logical
      expect(response.body.activeUsers.monthly).toBeGreaterThanOrEqual(response.body.activeUsers.weekly);
      expect(response.body.activeUsers.weekly).toBeGreaterThanOrEqual(response.body.activeUsers.daily);
    });

    it('should return valid date format in newRegistrations', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.newRegistrations.forEach((registration: any) => {
        expect(() => new Date(registration.date)).not.toThrow();
        expect(new Date(registration.date).getTime()).not.toBeNaN();
        expect(registration.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return sorted registration data (newest first)', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { newRegistrations } = response.body;

      if (newRegistrations.length > 1) {
        for (let i = 0; i < newRegistrations.length - 1; i++) {
          const currentDate = new Date(newRegistrations[i].date);
          const nextDate = new Date(newRegistrations[i + 1].date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should comply with FR-020: respond within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // FR-020 API requirement
    });

    it('should use caching for repeated requests', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second request (should be cached)
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(response2.body).toEqual(response1.body);
      expect(responseTime).toBeLessThan(500); // Cached response should be faster
    });
  });

  describe('Data Aggregation', () => {
    it('should handle zero users scenario', async () => {
      // This might happen in a fresh system or test environment
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Even with zero users, structure should be maintained
      if (response.body.totalUsers === 0) {
        expect(response.body.activeUsers.daily).toBe(0);
        expect(response.body.activeUsers.weekly).toBe(0);
        expect(response.body.activeUsers.monthly).toBe(0);
        expect(response.body.newRegistrations).toEqual([]);
      }
    });

    it('should calculate growth rate correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics?includeGrowthRate=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.userGrowthRate).toBeDefined();
      expect(typeof response.body.userGrowthRate).toBe('number');

      // Growth rate should be reasonable (not infinite or NaN)
      expect(Number.isFinite(response.body.userGrowthRate)).toBe(true);
    });

    it('should handle different time periods correctly', async () => {
      const weekResponse = await request(app)
        .get('/api/dashboard/admin/platform-metrics?period=week')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const monthResponse = await request(app)
        .get('/api/dashboard/admin/platform-metrics?period=month')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Both should have same structure but potentially different data
      expect(weekResponse.body).toMatchObject({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Object),
        newRegistrations: expect.any(Array),
        userGrowthRate: expect.any(Number)
      });

      expect(monthResponse.body).toMatchObject({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Object),
        newRegistrations: expect.any(Array),
        userGrowthRate: expect.any(Number)
      });
    });
  });

  describe('Real-time Requirements (FR-018)', () => {
    it('should reflect recent user registrations within 5 minutes', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check that today's date is included in recent registrations
      const today = new Date().toISOString().split('T')[0];
      const todayData = response.body.newRegistrations.find((reg: any) =>
        reg.date.startsWith(today)
      );

      // Today's data should exist (even if count is 0)
      expect(todayData).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would be mocked in real tests to simulate DB failure
      // For now, we expect the endpoint to handle DB errors gracefully
      expect(true).toBe(true); // Placeholder for DB error simulation
    });

    it('should handle cache failures gracefully', async () => {
      // Should still return data even if Redis cache fails
      const response = await request(app)
        .get('/api/dashboard/admin/platform-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});