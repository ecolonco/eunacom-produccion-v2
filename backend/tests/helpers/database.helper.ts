import { PrismaClient, UserRole } from '@prisma/client';
import { TEST_USERS } from './auth.helper';

const prisma = new PrismaClient();

export async function setupTestDatabase(): Promise<void> {
  try {
    // Clean up existing test data
    await cleanupTestDatabase();

    // Create test users using individual creates to ensure they exist
    const usersToCreate = [
      {
        id: TEST_USERS.STUDENT.userId,
        email: TEST_USERS.STUDENT.email,
        firstName: 'Test',
        lastName: 'Student',
        role: UserRole.STUDENT,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
      {
        id: TEST_USERS.ADMIN.userId,
        email: TEST_USERS.ADMIN.email,
        firstName: 'Test',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
      {
        id: TEST_USERS.CONTENT_MANAGER.userId,
        email: TEST_USERS.CONTENT_MANAGER.email,
        firstName: 'Test',
        lastName: 'Content Manager',
        role: UserRole.CONTENT_MANAGER,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
      {
        id: 'test-student-id-123',
        email: 'student123@test.com',
        firstName: 'Test',
        lastName: 'Student 2',
        role: UserRole.STUDENT,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
      {
        id: 'admin-id',
        email: 'admin123@test.com',
        firstName: 'Test',
        lastName: 'Admin 2',
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
      {
        id: 'new-user-id',
        email: 'newuser@test.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.STUDENT,
        isActive: true,
        passwordHash: 'hashed_password_here',
      },
    ];

    for (const userData of usersToCreate) {
      await prisma.user.upsert({
        where: { id: userData.id },
        update: userData,
        create: userData,
      });
    }

    console.log('Test users created successfully');

    // Create test user metrics for the student
    await prisma.userMetrics.upsert({
      where: { userId: 'test-student-id-123' },
      update: {
        questionsAnswered: 50,
        correctAnswers: 35,
        studyStreak: 5,
        totalStudyTime: 300,
        lastActivity: new Date(),
      },
      create: {
        userId: 'test-student-id-123',
        questionsAnswered: 50,
        correctAnswers: 35,
        studyStreak: 5,
        totalStudyTime: 300,
        lastActivity: new Date(),
      },
    });

    console.log('Test user metrics created successfully');

    console.log('Test database setup completed successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Delete in order to respect foreign key constraints
    await prisma.studyRecommendation.deleteMany({});
    await prisma.specialtyProgress.deleteMany({});
    await prisma.userMetrics.deleteMany({});
    await prisma.contentAnalytic.deleteMany({});
    await prisma.platformMetric.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.specialty.deleteMany({});
    await prisma.question.deleteMany({});

    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
}

export async function closeTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}