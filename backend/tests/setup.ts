import dotenv from 'dotenv';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from './helpers/database.helper';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Mock console methods during tests to reduce noise
const originalConsole = console;

beforeAll(async () => {
  // Reduce console noise during tests
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(async () => {
  // Cleanup test database
  await cleanupTestDatabase();
  await closeTestDatabase();

  // Restore console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test timeout
jest.setTimeout(30000);