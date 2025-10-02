/**
 * EUNACOM Medical Taxonomy Database Service
 * Comprehensive taxonomy service that uses the actual database data
 */

import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

export interface QuestionClassification {
  specialtyId: string;
  specialtyName: string;
  topicId?: string;
  topicName?: string;
  confidence: number;
  keywords: string[];
  learningObjectives: string[];
  questionType: 'CLINICAL_CASE' | 'CONCEPT' | 'PROCEDURE' | 'DIAGNOSIS' | 'TREATMENT' | 'PREVENTION';
  reasoning: string;
}

export interface EunacomSpecialty {
  id: string;
  name: string;
  description?: string;
  code?: string;
  isActive: boolean;
  parentId?: string;
  children?: EunacomSpecialty[];
  topics?: EunacomTopic[];
}

export interface EunacomTopic {
  id: string;
  name: string;
  description?: string;
  specialtyId: string;
  specialty?: EunacomSpecialty;
}

export class EunacomTaxonomyDbService {
  /**
   * Get all main specialties (without parent)
   */
  static async getMainSpecialties(): Promise<EunacomSpecialty[]> {
    try {
      const specialties = await prisma.specialty.findMany({
        where: {
          parentId: null,
          isActive: true
        },
        include: {
          children: {
            where: { isActive: true },
            include: {
              topics: true
            }
          },
          topics: true
        },
        orderBy: { name: 'asc' }
      });

      return specialties;
    } catch (error) {
      logger.error('Error fetching main specialties:', error);
      throw error;
    }
  }

  /**
   * Get all specialties (including subspecialties)
   */
  static async getAllSpecialties(): Promise<EunacomSpecialty[]> {
    try {
      const specialties = await prisma.specialty.findMany({
        where: { isActive: true },
        include: {
          topics: true,
          children: true,
          parent: true
        },
        orderBy: { name: 'asc' }
      });

      return specialties;
    } catch (error) {
      logger.error('Error fetching all specialties:', error);
      throw error;
    }
  }

  /**
   * Get topics for a specific specialty
   */
  static async getTopicsForSpecialty(specialtyId: string): Promise<EunacomTopic[]> {
    try {
      const topics = await prisma.topic.findMany({
        where: {
          specialtyId: specialtyId
        },
        include: {
          specialty: true
        },
        orderBy: { name: 'asc' }
      });

      return topics;
    } catch (error) {
      logger.error('Error fetching topics for specialty:', error);
      throw error;
    }
  }

  /**
   * Search specialties by name or keyword
   */
  static async searchSpecialties(query: string): Promise<EunacomSpecialty[]> {
    try {
      const specialties = await prisma.specialty.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          topics: true,
          parent: true
        },
        orderBy: { name: 'asc' }
      });

      return specialties;
    } catch (error) {
      logger.error('Error searching specialties:', error);
      throw error;
    }
  }

  /**
   * Search topics by name or keyword
   */
  static async searchTopics(query: string): Promise<EunacomTopic[]> {
    try {
      const topics = await prisma.topic.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          specialty: true
        },
        orderBy: { name: 'asc' }
      });

      return topics;
    } catch (error) {
      logger.error('Error searching topics:', error);
      throw error;
    }
  }

  /**
   * Get taxonomy context for AI classification
   * This returns ONLY specialties that have topics for classification
   * to avoid confusion with parent specialties
   */
  static async getTaxonomyForAI(): Promise<{
    specialties: Array<{
      id: string;
      name: string;
      description?: string;
      topics: Array<{
        id: string;
        name: string;
        description?: string;
      }>;
    }>;
  }> {
    try {
      // Get all main specialties (parentId = null)
      const mainSpecialties = await prisma.specialty.findMany({
        where: { 
          isActive: true,
          parentId: null
        },
        include: {
          topics: true,
          children: true // Include subspecialties
        },
        orderBy: { name: 'asc' }
      });

      const taxonomyForAI = {
        specialties: []
      };

      for (const specialty of mainSpecialties) {
        // If specialty has direct topics, use them
        if (specialty.topics && specialty.topics.length > 0) {
          taxonomyForAI.specialties.push({
            id: specialty.id,
            name: specialty.name,
            description: specialty.description,
            topics: specialty.topics.map(topic => ({
              id: topic.id,
              name: topic.name,
              description: topic.description
            }))
          });
        }
        // If specialty has no direct topics but has children (subspecialties), use children as topics
        else if (specialty.children && specialty.children.length > 0) {
          taxonomyForAI.specialties.push({
            id: specialty.id,
            name: specialty.name,
            description: specialty.description,
            topics: specialty.children.map(child => ({
              id: child.id,
              name: child.name,
              description: child.description
            }))
          });
        }
      }

      // Also include subspecialties that have their own topics
      const subspecialtiesWithTopics = await prisma.specialty.findMany({
        where: { 
          isActive: true,
          parentId: { not: null },
          topics: {
            some: {} // Only subspecialties that have topics
          }
        },
        include: {
          topics: true
        },
        orderBy: { name: 'asc' }
      });

      for (const subspecialty of subspecialtiesWithTopics) {
        taxonomyForAI.specialties.push({
          id: subspecialty.id,
          name: subspecialty.name,
          description: subspecialty.description,
          topics: subspecialty.topics.map(topic => ({
            id: topic.id,
            name: topic.name,
            description: topic.description
          }))
        });
      }

      logger.info(`🎯 AI Taxonomy: Sending ${taxonomyForAI.specialties.length} specialties for classification`);

      return taxonomyForAI;
    } catch (error) {
      logger.error('Error getting taxonomy for AI:', error);
      throw error;
    }
  }

  /**
   * Find the best taxonomy match for a question using keyword analysis
   * This is a basic implementation that can be enhanced with AI
   */
  static async classifyQuestionBasic(questionContent: string): Promise<QuestionClassification> {
    try {
      const content = questionContent.toLowerCase();

      // Search for relevant specialties and topics
      const [relevantSpecialties, relevantTopics] = await Promise.all([
        this.searchSpecialties(content),
        this.searchTopics(content)
      ]);

      // Basic scoring algorithm
      let bestMatch: QuestionClassification = {
        specialtyId: '',
        specialtyName: 'Medicina Interna',
        confidence: 0.1,
        keywords: [],
        learningObjectives: [],
        questionType: 'CONCEPT',
        reasoning: 'Default classification - no specific match found'
      };

      // Score specialties based on keyword matches
      for (const specialty of relevantSpecialties) {
        const nameMatch = content.includes(specialty.name.toLowerCase());
        const descMatch = specialty.description && content.includes(specialty.description.toLowerCase());

        if (nameMatch || descMatch) {
          const confidence = nameMatch ? 0.8 : 0.6;
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              specialtyId: specialty.id,
              specialtyName: specialty.name,
              confidence,
              keywords: [specialty.name],
              learningObjectives: [`Evaluar conocimientos en ${specialty.name}`],
              questionType: 'CONCEPT',
              reasoning: `Matched specialty: ${specialty.name}`
            };
          }
        }
      }

      // Score topics for even better matches
      for (const topic of relevantTopics) {
        const nameMatch = content.includes(topic.name.toLowerCase());
        const descMatch = topic.description && content.includes(topic.description.toLowerCase());

        if (nameMatch || descMatch) {
          const confidence = nameMatch ? 0.9 : 0.7;
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              specialtyId: topic.specialtyId!,
              specialtyName: topic.specialty?.name || '',
              topicId: topic.id,
              topicName: topic.name,
              confidence,
              keywords: [topic.name, topic.specialty?.name || ''],
              learningObjectives: [`Evaluar conocimientos en ${topic.name}`],
              questionType: 'CONCEPT',
              reasoning: `Matched topic: ${topic.name} in ${topic.specialty?.name}`
            };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      logger.error('Error classifying question:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the taxonomy
   */
  static async getTaxonomyStats(): Promise<{
    totalSpecialties: number;
    mainSpecialties: number;
    subspecialties: number;
    totalTopics: number;
    averageTopicsPerSpecialty: number;
  }> {
    try {
      const [totalSpecialties, mainSpecialties, totalTopics] = await Promise.all([
        prisma.specialty.count({ where: { isActive: true } }),
        prisma.specialty.count({ where: { isActive: true, parentId: null } }),
        prisma.topic.count()
      ]);

      const subspecialties = totalSpecialties - mainSpecialties;
      const averageTopicsPerSpecialty = totalSpecialties > 0 ? totalTopics / totalSpecialties : 0;

      return {
        totalSpecialties,
        mainSpecialties,
        subspecialties,
        totalTopics,
        averageTopicsPerSpecialty: Math.round(averageTopicsPerSpecialty * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting taxonomy stats:', error);
      throw error;
    }
  }
}