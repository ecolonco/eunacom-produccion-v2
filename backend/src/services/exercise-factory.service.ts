import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EunacomTaxonomyService, QuestionClassification } from './eunacom-taxonomy';
import { OpenAIService } from './openai.service';

const prisma = new PrismaClient();

export interface QuestionVariation {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  content: string;
  explanation: string;
  alternatives: {
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export class ExerciseFactoryService {
  private openAIService: OpenAIService | null = null;
  private classificationMetrics = {
    totalAttempts: 0,
    successfulClassifications: 0,
    retriesNeeded: 0,
    fallbacksUsed: 0
  };

  constructor() {
    try {
      this.openAIService = new OpenAIService();
      logger.info('✅ OpenAI Service initialized successfully');
    } catch (error) {
      logger.error('❌ OpenAI Service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      logger.error('Exercise Factory will NOT work without OpenAI service');
      logger.error('Please check OPENAI_API_KEY environment variable');
      // Don't throw error to allow service to start without OpenAI
    }
  }

  /**
   * Get classification metrics
   */
  getClassificationMetrics() {
    const successRate = this.classificationMetrics.totalAttempts > 0 
      ? (this.classificationMetrics.successfulClassifications / this.classificationMetrics.totalAttempts * 100).toFixed(1)
      : '0';
    
    return {
      ...this.classificationMetrics,
      successRate: `${successRate}%`
    };
  }

  /**
   * Check if the service is available (OpenAI configured)
   */
  isServiceAvailable(): boolean {
    return this.openAIService !== null;
  }

  /**
   * Get service status information
   */
  getServiceStatus(): { available: boolean; error?: string } {
    if (this.openAIService) {
      return { available: true };
    } else {
      return { 
        available: false, 
        error: 'OpenAI API key not configured - please set OPENAI_API_KEY environment variable' 
      };
    }
  }

  /**
   * Process a batch of questions from CSV upload
   */
  async processQuestionsBatch(
    questions: string[],
    fileName: string,
    uploadedBy: string,
    jobId: string
  ): Promise<void> {
    try {
      logger.info(`Starting processQuestionsBatch: jobId=${jobId}, questionsCount=${questions.length}`);
      logger.info(`Questions array:`, questions);

      // Check if OpenAI service is available
      if (!this.isServiceAvailable()) {
        const error = 'OpenAI service not available - cannot process questions';
        logger.error(`❌ ${error}`);
        
        await prisma.processingJob.update({
          where: { id: jobId },
          data: { 
            status: 'FAILED',
            errorMessage: error,
            completedAt: new Date()
          }
        });
        return;
      }
      
      logger.info('✅ OpenAI service is available, proceeding with processing');

      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', startedAt: new Date() }
      });

      logger.info(`Updated job ${jobId} to RUNNING status`);

      for (let i = 0; i < questions.length; i++) {
        logger.info(`Processing question ${i + 1}/${questions.length}`);
        logger.info(`Question content: "${questions[i]}"`);

        if (!questions[i] || questions[i].trim().length === 0) {
          logger.warn(`Skipping empty question at index ${i}`);
          continue;
        }
        const questionContent = questions[i];

        try {
          // Create base question
          const baseQuestion = await prisma.baseQuestion.create({
            data: {
              content: questionContent,
              sourceFile: fileName,
              uploadedBy: uploadedBy,
              status: 'PENDING'
            }
          });

          logger.info(`Created base question ${i + 1}/${questions.length}: ${baseQuestion.id}`);

          // IMMEDIATELY start AI analysis and variation generation
          try {
            await this.analyzeQuestion(baseQuestion);
            logger.info(`Completed AI processing for question ${baseQuestion.id}`);
          } catch (aiError) {
            logger.error(`AI processing failed for question ${baseQuestion.id}:`, aiError);
            // Continue with next question even if AI fails
          }

          // Update progress
          await prisma.processingJob.update({
            where: { id: jobId },
            data: { processedItems: i + 1 }
          });

        } catch (error) {
          logger.error(`Error processing question ${i + 1}:`, error);
          continue; // Continue with next question
        }
      }

      logger.info(`Finished processing loop. About to mark job ${jobId} as COMPLETED`);

      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      logger.info(`Completed processing batch of ${questions.length} questions for job ${jobId}`);

    } catch (error) {
      logger.error('Error in processQuestionsBatch:', error);

      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Validate AI classification against official taxonomy
   */
  async validateClassification(specialty: string, topic: string): Promise<{
    isValid: boolean;
    message: string;
    suggestions?: { specialties: string[]; topics: string[] };
  }> {
    try {
      logger.info(`🔍 Validating classification: ${specialty} -> ${topic}`);

      // Check if specialty exists (exact match first, then fuzzy)
      let specialtyExists = await prisma.specialty.findFirst({
        where: {
          name: specialty,
          isActive: true
        },
        include: { topics: true }
      });

      // If exact match fails, try fuzzy search
      if (!specialtyExists) {
        const fuzzySpecialties = await prisma.specialty.findMany({
          where: {
            name: { contains: specialty, mode: 'insensitive' },
            isActive: true
          },
          include: { topics: true },
          take: 3
        });

        if (fuzzySpecialties.length > 0) {
          logger.warn(`❌ Exact specialty '${specialty}' not found. Similar: ${fuzzySpecialties.map(s => s.name).join(', ')}`);
          return {
            isValid: false,
            message: `Especialidad '${specialty}' no encontrada`,
            suggestions: {
              specialties: fuzzySpecialties.map(s => s.name),
              topics: []
            }
          };
        }

        logger.warn(`❌ Specialty not found: ${specialty}`);
        return {
          isValid: false,
          message: `Especialidad '${specialty}' no existe en la taxonomía`,
          suggestions: { specialties: [], topics: [] }
        };
      }

      // If topic is provided, validate it exists within the specialty
      if (topic) {
        const topicExists = specialtyExists.topics.find(t => t.name === topic);

        if (!topicExists) {
          // Try fuzzy search for topics
          const fuzzyTopics = specialtyExists.topics.filter(t => 
            t.name.toLowerCase().includes(topic.toLowerCase()) ||
            topic.toLowerCase().includes(t.name.toLowerCase())
          );

          logger.warn(`❌ Topic '${topic}' not found in specialty '${specialty}'`);
          return {
            isValid: false,
            message: `Tema '${topic}' no encontrado en especialidad '${specialty}'`,
            suggestions: {
              specialties: [specialty],
              topics: fuzzyTopics.length > 0 ? fuzzyTopics.map(t => t.name) : specialtyExists.topics.slice(0, 5).map(t => t.name)
            }
          };
        }
      }

      logger.info(`✅ Classification validated: ${specialty} -> ${topic}`);
      return {
        isValid: true,
        message: `Clasificación válida: ${specialty} -> ${topic}`
      };

    } catch (error) {
      logger.error('Error validating classification:', error);
      return {
        isValid: false,
        message: 'Error interno en validación',
        suggestions: { specialties: [], topics: [] }
      };
    }
  }

  /**
   * Analyze a question using AI to determine taxonomy and classification
   */
  async analyzeQuestion(baseQuestion: any): Promise<void> {
    try {
      await prisma.baseQuestion.update({
        where: { id: baseQuestion.id },
        data: { status: 'ANALYZING' }
      });

      // Track classification attempt
      this.classificationMetrics.totalAttempts++;

      // Load available taxonomy from database
      logger.info('📚 Loading official EUNACOM taxonomy from database');
      const specialties = await prisma.specialty.findMany({
        where: { isActive: true },
        include: {
          topics: {
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });

      const availableTaxonomy = specialties.map(spec => ({
        specialty: spec.name,
        topics: spec.topics.map(t => t.name)
      }));

      const totalTopics = availableTaxonomy.reduce((sum, spec) => sum + spec.topics.length, 0);
      logger.info(`✅ Loaded ${specialties.length} specialties with ${totalTopics} topics for AI classification`);

      // Log taxonomy for verification (first 5 specialties)
      logger.info('📋 Available taxonomy (sample):');
      availableTaxonomy.slice(0, 5).forEach(spec => {
        logger.info(`  - ${spec.specialty}: ${spec.topics.join(', ')}`);
      });
      if (specialties.length > 5) {
        logger.info(`  ... and ${specialties.length - 5} more specialties`);
      }

      // Use OpenAI to analyze the question with official taxonomy
      if (!this.openAIService) {
        throw new Error('OpenAI service not available - API key not configured');
      }
      const analysis = await this.openAIService.analyzeQuestion(baseQuestion.content, availableTaxonomy);

      // VALIDATE AI classification against official taxonomy
      const validationResult = await this.validateClassification(analysis.specialty, analysis.topic);
      if (!validationResult.isValid) {
        logger.warn(`Invalid AI classification: ${analysis.specialty} -> ${analysis.topic}`);
        logger.warn(`Validation message: ${validationResult.message}`);
        
        if (validationResult.suggestions?.specialties.length || validationResult.suggestions?.topics.length) {
          logger.info(`Suggestions - Specialties: ${validationResult.suggestions.specialties.join(', ')}`);
          logger.info(`Suggestions - Topics: ${validationResult.suggestions.topics.join(', ')}`);
        }

        // Try once more with explicit instruction and suggestions
        let retryPrompt = baseQuestion.content + "\n\nIMPORTANT: Choose ONLY from official EUNACOM taxonomy.";
        if (validationResult.suggestions?.specialties.length) {
          retryPrompt += `\nSuggested specialties: ${validationResult.suggestions.specialties.join(', ')}`;
        }
        if (validationResult.suggestions?.topics.length) {
          retryPrompt += `\nSuggested topics: ${validationResult.suggestions.topics.join(', ')}`;
        }

        const correctedAnalysis = await this.openAIService.analyzeQuestion(retryPrompt);
        
        const correctedValidation = await this.validateClassification(correctedAnalysis.specialty, correctedAnalysis.topic);
        if (correctedValidation.isValid) {
          Object.assign(analysis, correctedAnalysis);
          this.classificationMetrics.retriesNeeded++;
          this.classificationMetrics.successfulClassifications++;
          logger.info(`✅ Corrected classification: ${analysis.specialty} -> ${analysis.topic}`);
        } else {
          logger.error(`❌ AI still providing invalid classification after retry`);
          logger.error(`Final validation: ${correctedValidation.message}`);
          
          // Use the best available suggestion as fallback
          if (validationResult.suggestions?.specialties.length && validationResult.suggestions?.topics.length) {
            analysis.specialty = validationResult.suggestions.specialties[0];
            analysis.topic = validationResult.suggestions.topics[0];
            this.classificationMetrics.fallbacksUsed++;
            logger.info(`🔄 Using suggested fallback: ${analysis.specialty} -> ${analysis.topic}`);
          } else {
            // Last resort fallback
            analysis.specialty = 'Medicina Interna';
            analysis.topic = 'Generalidades';
            this.classificationMetrics.fallbacksUsed++;
            logger.warn(`⚠️ Using default fallback: ${analysis.specialty} -> ${analysis.topic}`);
          }
        }
      } else {
        this.classificationMetrics.successfulClassifications++;
        logger.info(`✅ Valid classification: ${validationResult.message}`);
      }

      // Log current metrics every 10 classifications
      if (this.classificationMetrics.totalAttempts % 10 === 0) {
        const metrics = this.getClassificationMetrics();
        logger.info(`📊 Classification Metrics - Success Rate: ${metrics.successRate}, Retries: ${metrics.retriesNeeded}, Fallbacks: ${metrics.fallbacksUsed}`);
      }

      // Save AI analysis (upsert to handle existing records)
      logger.info(`Checking prisma.aIAnalysis availability: ${prisma.aIAnalysis ? 'YES' : 'NO'}`);
      
      await prisma.aIAnalysis.upsert({
        where: { baseQuestionId: baseQuestion.id },
        create: {
          baseQuestionId: baseQuestion.id,
          specialty: analysis.specialty || 'General',
          topic: analysis.topic || 'Unknown',
          difficulty: analysis.difficulty || 'MEDIUM',
          analysisResult: JSON.stringify(analysis)
        },
        update: {
          specialty: analysis.specialty || 'General',
          topic: analysis.topic || 'Unknown',
          difficulty: analysis.difficulty || 'MEDIUM',
          analysisResult: JSON.stringify(analysis)
        }
      });

      // Update status to ready for variation generation
      await prisma.baseQuestion.update({
        where: { id: baseQuestion.id },
        data: { status: 'GENERATING_VARIATIONS' }
      });

      // Generate variations
      await this.generateVariations(baseQuestion.id, analysis);

    } catch (error) {
      logger.error('Error analyzing question:', error);

      await prisma.baseQuestion.update({
        where: { id: baseQuestion.id },
        data: { status: 'PENDING' }
      });
    }
  }

  /**
   * Generate 4 variations of a question (all MEDIUM difficulty for consistency)
   */
  async generateVariations(baseQuestionId: string, analysis: QuestionClassification): Promise<void> {
    try {
      const baseQuestion = await prisma.baseQuestion.findUnique({
        where: { id: baseQuestionId }
      });

      if (!baseQuestion) {
        throw new Error('Base question not found');
      }

      // Define variation distribution (4 variations, all MEDIUM for consistency)
      const variationPlan = [
        { difficulty: 'MEDIUM', count: 4 }
      ];

      let variationNumber = 1;

      for (const plan of variationPlan) {
        for (let i = 0; i < plan.count; i++) {
          if (!this.openAIService) {
            throw new Error('OpenAI service not available - cannot generate variations');
          }
          const variation = await this.openAIService.generateQuestionVariation(
            baseQuestion.content,
            variationNumber
          );

          // Save question variation
          const savedVariation = await prisma.questionVariation.create({
            data: {
              baseQuestionId: baseQuestionId,
              difficulty: plan.difficulty,
              variationNumber: variationNumber,
              content: variation.content,
              explanation: variation.explanation
            }
          });

          // Randomize alternatives order to avoid predictable correct answers
          const shuffledAlternatives = this.shuffleAlternatives([...variation.alternatives]);
          
          // Save alternatives
          for (let altIndex = 0; altIndex < shuffledAlternatives.length; altIndex++) {
            const alt = shuffledAlternatives[altIndex];
            await prisma.alternative.create({
              data: {
                variationId: savedVariation.id,
                text: alt.text,
                isCorrect: alt.isCorrect,
                explanation: alt.explanation || null,
                order: altIndex + 1
              }
            });
          }

          variationNumber++;
        }
      }

      // Update base question status
      await prisma.baseQuestion.update({
        where: { id: baseQuestionId },
        data: { status: 'REVIEW_REQUIRED' }
      });

      logger.info(`Generated 4 variations for question ${baseQuestionId}`);

    } catch (error) {
      logger.error('Error generating variations:', error);
      throw error;
    }
  }

  /**
   * Approve a question variation and convert it to final question
   */
  async approveVariation(variationId: string, reviewedBy: string): Promise<string> {
    try {
      const variation = await prisma.questionVariation.findUnique({
        where: { id: variationId },
        include: {
          alternatives: true,
          baseQuestion: {
            include: {
              aiAnalysis: true
            }
          }
        }
      });

      if (!variation || !variation.baseQuestion.aiAnalysis) {
        throw new Error('Variation or analysis not found');
      }

      const analysis = variation.baseQuestion.aiAnalysis;

      // Find specialty using fuzzy matching with official taxonomy
      let specialty = await prisma.specialty.findFirst({
        where: { 
          name: {
            contains: analysis.specialty,
            mode: 'insensitive'
          }
        }
      });

      // If not found, try partial matching
      if (!specialty) {
        const allSpecialties = await prisma.specialty.findMany({
          select: { id: true, name: true }
        });
        
        // Simple fuzzy matching - find the closest match
        const normalizedAnalysis = analysis.specialty.toLowerCase().trim();
        const foundSpecialty = allSpecialties.find(s => 
          s.name.toLowerCase().includes(normalizedAnalysis) ||
          normalizedAnalysis.includes(s.name.toLowerCase())
        );
        
        // If found, get the full specialty object
        if (foundSpecialty) {
          specialty = await prisma.specialty.findUnique({
            where: { id: foundSpecialty.id }
          });
        }
        
        // If still not found, use a default specialty
        if (!specialty) {
          logger.warn(`⚠️ Specialty '${analysis.specialty}' not found in official taxonomy, using default`);
          specialty = await prisma.specialty.findFirst({
            where: { name: { contains: 'Medicina Interna', mode: 'insensitive' } }
          });
          
          // Last resort: create if absolutely necessary
          if (!specialty) {
            specialty = await prisma.specialty.create({
              data: {
                name: 'Medicina Interna',
                description: 'Especialidad por defecto',
                code: 'MEDICINA_INTERNA'
              }
            });
          }
        }
      }

      // Find topic using fuzzy matching within the specialty
      let topic = await prisma.topic.findFirst({
        where: {
          specialtyId: specialty.id,
          name: {
            contains: analysis.topic,
            mode: 'insensitive'
          }
        }
      });

      // If not found, try partial matching within the specialty
      if (!topic) {
        const specialtyTopics = await prisma.topic.findMany({
          where: { specialtyId: specialty.id },
          select: { id: true, name: true }
        });
        
        const normalizedTopic = analysis.topic.toLowerCase().trim();
        const foundTopic = specialtyTopics.find(t => 
          t.name.toLowerCase().includes(normalizedTopic) ||
          normalizedTopic.includes(t.name.toLowerCase())
        );
        
        // If found, get the full topic object
        if (foundTopic) {
          topic = await prisma.topic.findUnique({
            where: { id: foundTopic.id }
          });
        }
        
        // If still not found, use a default topic for this specialty
        if (!topic) {
          logger.warn(`⚠️ Topic '${analysis.topic}' not found in specialty '${specialty.name}', using default`);
          topic = await prisma.topic.findFirst({
            where: { 
              specialtyId: specialty.id,
              name: { contains: 'General', mode: 'insensitive' }
            }
          });
          
          // Last resort: create a general topic
          if (!topic) {
            topic = await prisma.topic.create({
              data: {
                name: 'Generalidades',
                description: 'Tema general por defecto',
                specialtyId: specialty.id
              }
            });
          }
        }
      }

      logger.info(`✅ Mapped AI classification: "${analysis.specialty}" -> "${specialty.name}", "${analysis.topic}" -> "${topic.name}"`);

      // Create final question
      const finalQuestion = await prisma.question.create({
        data: {
          content: variation.content,
          explanation: variation.explanation,
          difficulty: variation.difficulty as any,
          type: 'MULTIPLE_CHOICE',
          specialtyId: specialty.id,
          topicId: topic.id,
          isActive: true,
          isReviewed: true,
          options: {
            create: variation.alternatives.map(alt => ({
              text: alt.text,
              isCorrect: alt.isCorrect,
              order: alt.order
            }))
          }
        }
      });

      // Update variation as approved
      await prisma.questionVariation.update({
        where: { id: variationId },
        data: {
          // Variation approved - could add approval tracking in the future
        }
      });

      logger.info(`Approved variation ${variationId} as question ${finalQuestion.id}`);

      return finalQuestion.id;

    } catch (error) {
      logger.error('Error approving variation:', error);
      throw error;
    }
  }

  /**
   * Get quality metrics for the factory
   */
  async getQualityMetrics(): Promise<any> {
    try {
      const [
        totalBaseQuestions,
        analyzedQuestions,
        generatedVariations,
        approvedVariations,
        finalQuestions
      ] = await Promise.all([
        prisma.baseQuestion.count(),
        prisma.baseQuestion.count({ where: { status: { not: 'PENDING' } } }),
        prisma.questionVariation.count(),
        prisma.questionVariation.count(),
        prisma.question.count()
      ]);

      return {
        totalBaseQuestions,
        analyzedQuestions,
        generatedVariations,
        approvedVariations,
        finalQuestions,
        analysisRate: totalBaseQuestions > 0 ? (analyzedQuestions / totalBaseQuestions) * 100 : 0,
        approvalRate: generatedVariations > 0 ? (approvedVariations / generatedVariations) * 100 : 0
      };

    } catch (error) {
      logger.error('Error getting quality metrics:', error);
      throw error;
    }
  }

  /**
   * Shuffles an array of alternatives to randomize the order of correct answers
   * Uses Fisher-Yates shuffle algorithm
   */
  private shuffleAlternatives(alternatives: any[]): any[] {
    const shuffled = [...alternatives];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
