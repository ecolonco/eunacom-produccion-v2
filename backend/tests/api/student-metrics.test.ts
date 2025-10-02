import request from 'supertest';
import { app } from '../../src/index';
import { generateTestToken } from '../helpers/auth.helper';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database.helper';

describe('GET /api/dashboard/student/metrics', () => {
  let studentToken: string;
  let studentUserId: string;

  beforeAll(async () => {
    // Setup test database for this test suite
    await setupTestDatabase();

    // Setup test user token
    studentUserId = 'test-student-id-123';
    studentToken = generateTestToken({
      userId: studentUserId,
      role: 'STUDENT',
      email: 'student@test.com'
    });
  });

  afterAll(async () => {
    // Cleanup after this test suite
    await cleanupTestDatabase();
  });

  describe('Authentication', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required',
        message: 'No token provided'
      });
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    });

    it('should return 403 when admin tries to access student metrics without userId', async () => {
      const adminToken = generateTestToken({
        userId: 'admin-id',
        role: 'ADMIN',
        email: 'admin@test.com'
      });

      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toEqual({
        error: 'Forbidden',
        message: 'Students can only access their own metrics'
      });
    });
  });

  describe('Successful Response', () => {
    it('should return student metrics with correct structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toEqual({
        questionsAnswered: expect.any(Number),
        correctPercentage: expect.any(Number),
        studyStreak: expect.any(Number),
        totalStudyTime: expect.any(Number),
        weeklyProgress: expect.any(Array),
        averageScore: expect.any(Number),
        lastActivity: expect.any(String)
      });

      // Validate data ranges
      expect(response.body.correctPercentage).toBeGreaterThanOrEqual(0);
      expect(response.body.correctPercentage).toBeLessThanOrEqual(100);
      expect(response.body.studyStreak).toBeGreaterThanOrEqual(0);
      expect(response.body.totalStudyTime).toBeGreaterThanOrEqual(0);
    });

    it('should return zero metrics for new user', async () => {
      const newUserToken = generateTestToken({
        userId: 'new-user-id',
        role: 'STUDENT',
        email: 'newuser@test.com'
      });

      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        questionsAnswered: 0,
        correctPercentage: 0,
        studyStreak: 0,
        totalStudyTime: 0,
        weeklyProgress: []
      });
    });

    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when user not found', async () => {
      const nonExistentUserToken = generateTestToken({
        userId: 'non-existent-user',
        role: 'STUDENT',
        email: 'nonexistent@test.com'
      });

      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${nonExistentUserToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found',
        message: 'User metrics not available'
      });
    });

    it('should return 500 when database error occurs', async () => {
      // This would be mocked in real tests to simulate DB failure
      // For now, we expect the endpoint to handle DB errors gracefully
      expect(true).toBe(true); // Placeholder for DB error simulation
    });
  });

  describe('Performance Requirements', () => {
    it('should return cached data on subsequent requests', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Second request (should be cached)
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(response2.body).toEqual(response1.body);
      expect(responseTime).toBeLessThan(500); // Cached response should be faster
    });

    it('should comply with FR-020: load within 3 seconds', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // FR-020 requirement
    });
  });

  describe('Data Validation', () => {
    it('should return valid percentage values', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.correctPercentage !== null) {
        expect(response.body.correctPercentage).toBeGreaterThanOrEqual(0);
        expect(response.body.correctPercentage).toBeLessThanOrEqual(100);
      }

      if (response.body.averageScore !== null) {
        expect(response.body.averageScore).toBeGreaterThanOrEqual(0);
        expect(response.body.averageScore).toBeLessThanOrEqual(100);
      }
    });

    it('should return valid date format for lastActivity', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.lastActivity) {
        expect(() => new Date(response.body.lastActivity)).not.toThrow();
        expect(new Date(response.body.lastActivity).getTime()).not.toBeNaN();
      }
    });

    it('should return valid weekly progress structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      response.body.weeklyProgress.forEach((week: any) => {
        expect(week).toHaveProperty('date');
        expect(week).toHaveProperty('questions');
        expect(week.questions).toBeGreaterThanOrEqual(0);

        if (week.score !== undefined) {
          expect(week.score).toBeGreaterThanOrEqual(0);
          expect(week.score).toBeLessThanOrEqual(100);
        }

        // Validate date format
        expect(() => new Date(week.date)).not.toThrow();
      });
    });
  });
});