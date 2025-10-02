require('dotenv').config({ path: '.env.test' });

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('./src/index');

async function debugAuth() {
  console.log('JWT_SECRET:', process.env.JWT_SECRET);

  // Generate token exactly like the test helper
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  console.log('Secret being used:', secret);

  const token = jwt.sign(
    {
      userId: 'test-student-id-123',
      role: 'STUDENT',
      email: 'student@test.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    },
    secret
  );

  console.log('Generated token:', token);

  // Try to verify it manually
  try {
    const decoded = jwt.verify(token, secret);
    console.log('Token verified successfully:', decoded);
  } catch (error) {
    console.log('Token verification failed:', error.message);
  }

  // Now test the actual endpoint
  try {
    const response = await request(app)
      .get('/api/dashboard/student/metrics')
      .set('Authorization', `Bearer ${token}`);

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);
  } catch (error) {
    console.log('Request failed:', error.message);
  }

  process.exit(0);
}

debugAuth();