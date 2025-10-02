import { PrismaClient, UserRole, Difficulty, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create specialties
  const internalMedicine = await prisma.specialty.upsert({
    where: { name: 'Medicina Interna' },
    update: {},
    create: {
      name: 'Medicina Interna',
      description: 'Especialidad médica que se dedica al estudio, diagnóstico y tratamiento de las enfermedades del adulto',
      code: 'MED_INT'
    }
  });

  const cardiology = await prisma.specialty.upsert({
    where: { name: 'Cardiología' },
    update: {},
    create: {
      name: 'Cardiología',
      description: 'Especialidad médica que se encarga del estudio, diagnóstico y tratamiento del corazón',
      code: 'CARDIO',
      parentId: internalMedicine.id
    }
  });

  const surgery = await prisma.specialty.upsert({
    where: { name: 'Cirugía General' },
    update: {},
    create: {
      name: 'Cirugía General',
      description: 'Especialidad médica que abarca las operaciones del aparato digestivo',
      code: 'CIR_GEN'
    }
  });

  // Create topics
  const heartFailure = await prisma.topic.upsert({
    where: {
      name_specialtyId: {
        name: 'Insuficiencia Cardíaca',
        specialtyId: cardiology.id
      }
    },
    update: {},
    create: {
      name: 'Insuficiencia Cardíaca',
      description: 'Trastorno en el cual el corazón no puede bombear suficiente sangre',
      specialtyId: cardiology.id
    }
  });

  const hypertension = await prisma.topic.upsert({
    where: {
      name_specialtyId: {
        name: 'Hipertensión Arterial',
        specialtyId: cardiology.id
      }
    },
    update: {},
    create: {
      name: 'Hipertensión Arterial',
      description: 'Presión arterial elevada de forma sostenida',
      specialtyId: cardiology.id
    }
  });

  // Create sample questions
  const question1 = await prisma.question.create({
    data: {
      content: '¿Cuál es el tratamiento de primera línea para la insuficiencia cardíaca con fracción de eyección reducida?',
      explanation: 'Los IECA (inhibidores de la enzima convertidora de angiotensina) son el tratamiento de primera línea para la insuficiencia cardíaca con fracción de eyección reducida, ya que mejoran la supervivencia y reducen las hospitalizaciones.',
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MULTIPLE_CHOICE,
      specialtyId: cardiology.id,
      topicId: heartFailure.id,
      isActive: true,
      isReviewed: true,
      options: {
        create: [
          { text: 'IECA (Enalapril)', isCorrect: true, order: 1 },
          { text: 'Beta-bloqueadores', isCorrect: false, order: 2 },
          { text: 'Diuréticos de asa', isCorrect: false, order: 3 },
          { text: 'Digitálicos', isCorrect: false, order: 4 }
        ]
      }
    }
  });

  const question2 = await prisma.question.create({
    data: {
      content: '¿Cuál es el valor normal de la presión arterial según las guías actuales?',
      explanation: 'Según las guías de la ESC/ESH 2018, la presión arterial normal se define como PAS < 120 mmHg y PAD < 80 mmHg.',
      difficulty: Difficulty.EASY,
      type: QuestionType.MULTIPLE_CHOICE,
      specialtyId: cardiology.id,
      topicId: hypertension.id,
      isActive: true,
      isReviewed: true,
      options: {
        create: [
          { text: '< 120/80 mmHg', isCorrect: true, order: 1 },
          { text: '< 130/85 mmHg', isCorrect: false, order: 2 },
          { text: '< 140/90 mmHg', isCorrect: false, order: 3 },
          { text: '< 160/100 mmHg', isCorrect: false, order: 4 }
        ]
      }
    }
  });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@eunacom.local' },
    update: {},
    create: {
      email: 'admin@eunacom.local',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'EUNACOM',
      passwordHash: '$2b$10$8K1p/a0dUrwct93c1/o8Le.8GBvyF5YmxDk8S4LrQu3j5YL8PdVOe', // password: admin123
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      credits: 999999
    }
  });

  // Create demo student user
  const studentUser = await prisma.user.upsert({
    where: { email: 'estudiante@eunacom.local' },
    update: {},
    create: {
      email: 'estudiante@eunacom.local',
      username: 'estudiante',
      firstName: 'Estudiante',
      lastName: 'Demo',
      passwordHash: '$2b$10$8K1p/a0dUrwct93c1/o8Le.8GBvyF5YmxDk8S4LrQu3j5YL8PdVOe', // password: admin123
      role: UserRole.STUDENT,
      isActive: true,
      isVerified: true,
      credits: 100,
      profile: {
        create: {
          medicalSchool: 'Universidad Demo',
          graduationYear: 2024,
          specialty: 'Medicina Interna',
          studyGoals: 'Preparación EUNACOM 2025',
          weeklyStudyHours: 20
        }
      }
    }
  });

  // Create sample quiz
  const practiceQuiz = await prisma.quiz.create({
    data: {
      title: 'Práctica de Cardiología Básica',
      description: 'Quiz de práctica con preguntas básicas de cardiología',
      questionCount: 2,
      timeLimit: 30,
      passingScore: 60,
      specialtyId: cardiology.id,
      isActive: true,
      isPublic: true,
      questions: {
        create: [
          { questionId: question1.id, order: 1, points: 1 },
          { questionId: question2.id, order: 2, points: 1 }
        ]
      }
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Created:');
  console.log(`- ${3} Specialties`);
  console.log(`- ${2} Topics`);
  console.log(`- ${2} Questions`);
  console.log(`- ${2} Users (admin@eunacom.local / estudiante@eunacom.local)`);
  console.log(`- ${1} Quiz`);
  console.log('\n🔐 Default credentials:');
  console.log('Admin: admin@eunacom.local / admin123');
  console.log('Student: estudiante@eunacom.local / admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });