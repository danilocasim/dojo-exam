import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ExamAttemptService } from './services/exam-attempt.service';
import { ExamAttemptController } from './controllers/exam-attempt.controller';

/**
 * ExamAttempt Module
 * Handles exam submission, retrieval, and cloud sync tracking
 * Provides REST API for mobile app and admin portal
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExamAttemptController],
  providers: [ExamAttemptService],
  exports: [ExamAttemptService],
})
export class ExamAttemptModule {}
