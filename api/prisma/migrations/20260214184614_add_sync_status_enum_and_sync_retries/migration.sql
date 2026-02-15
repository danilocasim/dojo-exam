/*
  Warnings:

  - The `syncStatus` column on the `ExamAttempt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "ExamAttempt" DROP COLUMN "syncStatus",
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ExamAttempt_syncStatus_idx" ON "ExamAttempt"("syncStatus");
