import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExamTypeResponseDto,
  ExamDomainDto,
  QuestionBankResponseDto,
  QuestionDto,
  QuestionOptionDto,
  VersionResponseDto,
} from './dto';
import { QuestionType, Difficulty, QuestionStatus } from '@prisma/client';

@Injectable()
export class ExamTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<ExamTypeResponseDto> {
    let examType;
    try {
      examType = await this.prisma.examType.findUnique({
        where: { id },
      });
    } catch (err) {
      // Log Prisma error details for debugging
      console.error('[ExamTypesService.findOne] Prisma error:', err);
      throw new Error('Database query failed: ' + (err?.message || err));
    }

    if (!examType) {
      throw new NotFoundException(`Exam type '${id}' not found`);
    }

    if (!examType.isActive) {
      throw new NotFoundException(`Exam type '${id}' is not active`);
    }

    let domainsParsed: ExamDomainDto[] = [];
    try {
      // Defensive: domains may be string or object
      domainsParsed = typeof examType.domains === 'string'
        ? JSON.parse(examType.domains)
        : examType.domains;
    } catch (err) {
      console.error('[ExamTypesService.findOne] Domains parse error:', err, 'domains:', examType.domains);
      throw new Error('ExamType domains field is invalid JSON');
    }
    return {
      id: examType.id,
      name: examType.name,
      displayName: examType.displayName,
      description: examType.description,
      domains: domainsParsed,
      passingScore: examType.passingScore,
      timeLimit: examType.timeLimit,
      questionCount: examType.questionCount,
      isActive: examType.isActive,
    };
  }

  /**
   * Get questions for an exam type with optional pagination
   * T031: GET /exam-types/{examTypeId}/questions
   */
  async getQuestions(
    examTypeId: string,
    since?: number,
    limit: number = 100,
  ): Promise<QuestionBankResponseDto> {
    // Verify exam type exists and is active
    await this.findOne(examTypeId);

    // Build query conditions
    const whereCondition = {
      examTypeId,
      status: QuestionStatus.APPROVED,
      ...(since !== undefined && { version: { gt: since } }),
    };

    // Get questions ordered by version (oldest first for sync)
    const questions = await this.prisma.question.findMany({
      where: whereCondition,
      orderBy: { version: 'asc' },
      take: limit + 1, // Get one extra to check if there's more
    });

    // Determine if there are more questions
    const hasMore = questions.length > limit;
    const returnQuestions = hasMore ? questions.slice(0, limit) : questions;

    // Get the latest version across all approved questions
    const latestVersionResult = await this.prisma.question.aggregate({
      where: {
        examTypeId,
        status: QuestionStatus.APPROVED,
      },
      _max: { version: true },
    });

    const latestVersion = latestVersionResult._max.version ?? 0;

    // Map to DTOs
    const questionDtos: QuestionDto[] = returnQuestions.map((q) =>
      this.mapQuestionToDto(q),
    );

    const response: QuestionBankResponseDto = {
      questions: questionDtos,
      latestVersion,
      hasMore,
    };

    if (hasMore && returnQuestions.length > 0) {
      response.nextSince = returnQuestions[returnQuestions.length - 1].version;
    }

    return response;
  }

  /**
   * Get the latest version info for question bank
   * T032: GET /exam-types/{examTypeId}/questions/version
   */
  async getVersion(examTypeId: string): Promise<VersionResponseDto> {
    // Verify exam type exists and is active
    await this.findOne(examTypeId);

    // Get aggregate stats for approved questions
    const stats = await this.prisma.question.aggregate({
      where: {
        examTypeId,
        status: QuestionStatus.APPROVED,
      },
      _max: { version: true, updatedAt: true },
      _count: { id: true },
    });

    return {
      latestVersion: stats._max.version ?? 0,
      questionCount: stats._count.id,
      lastUpdatedAt: stats._max.updatedAt?.toISOString(),
    };
  }

  /**
   * Map Prisma Question model to QuestionDto
   */
  private mapQuestionToDto(question: {
    id: string;
    text: string;
    type: QuestionType;
    domain: string;
    difficulty: Difficulty;
    options: unknown;
    correctAnswers: string[];
    explanation: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): QuestionDto {
    return {
      id: question.id,
      text: question.text,
      type: this.mapQuestionType(question.type),
      domain: question.domain,
      difficulty: this.mapDifficulty(question.difficulty),
      options: question.options as QuestionOptionDto[],
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
      version: question.version,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };
  }

  /**
   * Map Prisma QuestionType enum to API string value
   */
  private mapQuestionType(
    type: QuestionType,
  ): 'single-choice' | 'multiple-choice' | 'true-false' {
    const typeMap: Record<
      QuestionType,
      'single-choice' | 'multiple-choice' | 'true-false'
    > = {
      SINGLE_CHOICE: 'single-choice',
      MULTIPLE_CHOICE: 'multiple-choice',
      TRUE_FALSE: 'true-false',
    };
    return typeMap[type];
  }

  /**
   * Map Prisma Difficulty enum to API string value
   */
  private mapDifficulty(difficulty: Difficulty): 'easy' | 'medium' | 'hard' {
    const difficultyMap: Record<Difficulty, 'easy' | 'medium' | 'hard'> = {
      EASY: 'easy',
      MEDIUM: 'medium',
      HARD: 'hard',
    };
    return difficultyMap[difficulty];
  }
}
