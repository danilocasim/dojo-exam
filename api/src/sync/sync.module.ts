import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamAttemptModule } from '../exam-attempts/exam-attempt.module';
import { SyncService } from './services/sync.service';

/**
 * Sync Module
 * Background processing for cloud synchronization
 * Handles pending exams, retries, and cleanup
 */
@Module({
  imports: [PrismaModule, ExamAttemptModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
