import request from 'supertest';
import { app } from '../../src/index';
import { generateTestToken, TEST_USERS } from '../helpers/auth.helper';

describe('GET /api/dashboard/student/specialties', () => {
  let studentToken: string;

  beforeAll(() => {
    studentToken = generateTestToken(TEST_USERS.STUDENT);
  });

  describe('Authentication', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required',
        message: 'No token provided'
      });
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    });
  });

  describe('Query Parameters', () => {
    it('should accept includeInactive parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties?includeInactive=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should default includeInactive to false', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // All returned specialties should be active (though this depends on implementation)
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should validate invalid includeInactive parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties?includeInactive=invalid')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid query parameter',
        message: 'includeInactive must be a boolean'
      });
    });
  });

  describe('Successful Response', () => {
    it('should return specialty progress with correct structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Check structure of each specialty item
      response.body.forEach((specialty: any) => {
        expect(specialty).toEqual({
          specialtyId: expect.any(String),
          name: expect.any(String),
          questionsAnswered: expect.any(Number),
          correctPercentage: expect.any(Number),
          difficultyBreakdown: expect.objectContaining({
            easy: expect.any(Number),
            medium: expect.any(Number),
            hard: expect.any(Number)
          }),
          lastPracticed: expect.any(String)
        });

        // Validate data ranges
        expect(specialty.questionsAnswered).toBeGreaterThanOrEqual(0);
        expect(specialty.correctPercentage).toBeGreaterThanOrEqual(0);
        expect(specialty.correctPercentage).toBeLessThanOrEqual(100);

        // Validate difficulty breakdown
        expect(specialty.difficultyBreakdown.easy).toBeGreaterThanOrEqual(0);
        expect(specialty.difficultyBreakdown.easy).toBeLessThanOrEqual(100);
        expect(specialty.difficultyBreakdown.medium).toBeGreaterThanOrEqual(0);
        expect(specialty.difficultyBreakdown.medium).toBeLessThanOrEqual(100);
        expect(specialty.difficultyBreakdown.hard).toBeGreaterThanOrEqual(0);
        expect(specialty.difficultyBreakdown.hard).toBeLessThanOrEqual(100);
      });
    });

    it('should return empty array for new user with no progress', async () => {
      const newUserToken = generateTestToken({
        userId: 'new-user-no-progress',
        role: 'STUDENT',
        email: 'newuser@test.com'
      });

      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return specialties sorted by last practiced date', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.length > 1) {
        // Check that dates are in descending order (most recent first)
        for (let i = 0; i < response.body.length - 1; i++) {
          const current = new Date(response.body[i].lastPracticed || '1970-01-01');
          const next = new Date(response.body[i + 1].lastPracticed || '1970-01-01');
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Data Validation', () => {
    it('should return valid date format for lastPracticed', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      response.body.forEach((specialty: any) => {
        if (specialty.lastPracticed) {
          expect(() => new Date(specialty.lastPracticed)).not.toThrow();
          expect(new Date(specialty.lastPracticed).getTime()).not.toBeNaN();
        }
      });
    });

    it('should handle specialty with zero questions answered', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Test that specialties with 0 questions are handled correctly
      const zeroQuestionSpecialties = response.body.filter((s: any) => s.questionsAnswered === 0);

      zeroQuestionSpecialties.forEach((specialty: any) => {
        expect(specialty.correctPercentage).toBe(0);
        expect(specialty.difficultyBreakdown.easy).toBe(0);
        expect(specialty.difficultyBreakdown.medium).toBe(0);
        expect(specialty.difficultyBreakdown.hard).toBe(0);
      });
    });

    it('should ensure difficulty breakdown percentages are consistent', async () => {
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      response.body.forEach((specialty: any) => {
        const { easy, medium, hard } = specialty.difficultyBreakdown;

        if (specialty.questionsAnswered > 0) {
          // The percentages don't need to sum to 100 as they represent
          // performance per difficulty level, not distribution
          expect(easy).toBeGreaterThanOrEqual(0);
          expect(medium).toBeGreaterThanOrEqual(0);
          expect(hard).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should comply with FR-020: respond within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // FR-020 API requirement
    });

    it('should handle large number of specialties efficiently', async () => {
      // Test with user who might have progress in many specialties
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Should handle up to reasonable number of medical specialties (typically 20-50)
      expect(response.body.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with progress but no specialties', async () => {
      // This might happen if a user has answered questions but specialties were later deleted
      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle concurrent requests without data corruption', async () => {
      // Send multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/dashboard/student/specialties')
          .set('Authorization', `Bearer ${studentToken}`)
      );

      const responses = await Promise.all(promises);

      // All should succeed and return consistent data
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      // Data should be consistent across all responses
      const firstResponse = JSON.stringify(responses[0]?.body);
      responses.forEach(response => {
        expect(JSON.stringify(response.body)).toBe(firstResponse);
      });
    });
  });

  describe('Admin Access', () => {
    it('should allow admin to access student specialties with userId parameter', async () => {
      const adminToken = generateTestToken(TEST_USERS.ADMIN);

      const response = await request(app)
        .get(`/api/dashboard/student/specialties?userId=${TEST_USERS.STUDENT.userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 when admin accesses without userId parameter', async () => {
      const adminToken = generateTestToken(TEST_USERS.ADMIN);

      const response = await request(app)
        .get('/api/dashboard/student/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing parameter',
        message: 'userId parameter required for admin access'
      });
    });
  });
});