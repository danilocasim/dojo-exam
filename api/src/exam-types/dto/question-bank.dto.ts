import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for GET /exam-types/{examTypeId}/questions
 */
export class GetQuestionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}

/**
 * Option within a question
 */
export class QuestionOptionDto {
  id: string;
  text: string;
}

/**
 * Question DTO for public API response
 * Maps API field names (lowercase enum values) per contracts/api.yaml
 */
export class QuestionDto {
  id: string;
  text: string;
  type: 'single-choice' | 'multiple-choice' | 'true-false';
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: QuestionOptionDto[];
  correctAnswers: string[];
  explanation: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for GET /exam-types/{examTypeId}/questions
 */
export class QuestionBankResponseDto {
  questions: QuestionDto[];
  latestVersion: number;
  hasMore: boolean;
  nextSince?: number;
}

/**
 * Response for GET /exam-types/{examTypeId}/questions/version
 */
export class VersionResponseDto {
  latestVersion: number;
  questionCount: number;
  lastUpdatedAt?: string;
}
