import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamAttemptService } from '../../exam-attempts/services/exam-attempt.service';
import { SyncStatus } from '@prisma/client';

export interface SyncResult {
  synced: number;
  failed: number;
  retried: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Sync Service
 * Background processor for cloud sync of exam attempts
 * Handles pending exams, retry logic, and error tracking
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly MAX_RETRIES = 12;
  private readonly RETRY_DELAY_MS = 5000; // 5 seconds

  constructor(
    private prisma: PrismaService,
    private examAttemptService: ExamAttemptService,
  ) {}

  /**
   * Process pending exam sync
   * Called by background job scheduler (e.g., every 5 minutes)
   * @returns Sync results with success/failure counts
   */
  async processPendingSync(): Promise<SyncResult> {
    this.logger.log('Starting pending sync processor');

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      retried: 0,
      errors: [],
    };

    try {
      // Fetch pending exams (limit to batch size for performance)
      const pendingExams = await this.examAttemptService.getPendingSync(100);

      if (pendingExams.length === 0) {
        this.logger.log('No pending exams to sync');
        return result;
      }

      this.logger.log(`Found ${pendingExams.length} pending exams to sync`);

      // Process each exam in parallel with concurrency limit
      const batchSize = 10;
      for (let i = 0; i < pendingExams.length; i += batchSize) {
        const batch = pendingExams.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((exam) => this.syncExamToCloud(exam.id)),
        );

        // Process batch results
        batchResults.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            if (res.value.success) {
              result.synced++;
            } else {
              result.failed++;
              result.errors.push({
                id: batch[idx].id,
                error: res.value.error || 'Unknown error',
              });
            }
          } else {
            result.failed++;
            result.errors.push({
              id: batch[idx].id,
              error: res.reason?.message || 'Unknown error',
            });
          }
        });
      }
    } catch (error) {
      this.logger.error(
        'Error during pending sync processing',
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Sync complete: ${result.synced} synced, ${result.failed} failed`,
    );
    return result;
  }

  /**
   * Process failed exams for retry
   * Called by background job scheduler (e.g., every hour)
   * @returns Sync results with retry counts
   */
  async processFailedSync(): Promise<SyncResult> {
    this.logger.log('Starting failed sync processor');

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      retried: 0,
      errors: [],
    };

    try {
      // Fetch failed exams with retry count below max
      const failedExams = await this.examAttemptService.getFailedSync(
        this.MAX_RETRIES,
        100,
      );

      if (failedExams.length === 0) {
        this.logger.log('No failed exams to retry');
        return result;
      }

      this.logger.log(`Found ${failedExams.length} exams to retry`);

      // Process each exam
      for (const exam of failedExams) {
        // Add exponential backoff delay based on retry count
        const delayMs = this.RETRY_DELAY_MS * Math.pow(2, exam.syncRetries);
        await this.sleep(delayMs);

        const syncResult = await this.syncExamToCloud(exam.id);

        if (syncResult.success) {
          result.synced++;
          result.retried++;
        } else {
          result.failed++;
          result.errors.push({
            id: exam.id,
            error: syncResult.error || 'Retry failed',
          });

          // Update retry count
          await this.examAttemptService.updateRetryCount(
            exam.id,
            exam.syncRetries + 1,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error during failed sync processing',
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Failed sync retry complete: ${result.synced} recovered, ${result.failed} still failing`,
    );
    return result;
  }

  /**
   * Sync single exam attempt to cloud
   * Private helper for cloud synchronization
   * @param examAttemptId - ExamAttempt primary key
   * @returns Success status and error message if failed
   */
  private async syncExamToCloud(examAttemptId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Fetch exam attempt from database
      const exam = await this.examAttemptService.findById(examAttemptId);
      if (!exam) {
        return { success: false, error: 'Exam not found' };
      }

      // TODO: Send to cloud storage service
      // This is a placeholder for the actual cloud sync logic
      // In a real implementation, this would:
      // 1. Send exam data to Cloud Storage (Firebase, AWS, etc.)
      // 2. Update user analytics in the cloud
      // 3. Return success/failure status

      // Simulate cloud sync delay
      await this.sleep(100);

      // Mark as synced
      await this.examAttemptService.markSynced(examAttemptId);

      this.logger.debug(`Synced exam attempt: ${examAttemptId}`);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to sync exam ${examAttemptId}: ${errorMsg}`);

      // Mark as failed
      await this.examAttemptService.markFailed(examAttemptId, errorMsg);

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get sync statistics
   * Used for monitoring and debugging
   * @returns Counts of exams by sync status
   */
  async getSyncStatistics(): Promise<{
    pending: number;
    synced: number;
    failed: number;
  }> {
    const [pending, synced, failed] = await Promise.all([
      this.prisma.examAttempt.count({
        where: { syncStatus: SyncStatus.PENDING },
      }),
      this.prisma.examAttempt.count({
        where: { syncStatus: SyncStatus.SYNCED },
      }),
      this.prisma.examAttempt.count({
        where: { syncStatus: SyncStatus.FAILED },
      }),
    ]);

    return { pending, synced, failed };
  }

  /**
   * Clean up old synced records
   * Deletes exams synced more than 30 days ago
   * Called periodically by background job
   * @param daysOld - Delete records older than this many days
   * @returns Number of records deleted
   */
  async cleanupOldSyncedRecords(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.examAttempt.deleteMany({
      where: {
        syncStatus: SyncStatus.SYNCED,
        syncedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} old synced records older than ${cutoffDate.toISOString()}`,
    );
    return result.count;
  }

  // === Helper Methods ===

  /**
   * Sleep utility for delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
