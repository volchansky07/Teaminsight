/*
  Warnings:

  - The values [MANUAL,AUTO] on the enum `TaskArchiveReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TaskArchiveReason_new" AS ENUM ('HIDDEN', 'COMPLETED', 'PROJECT_ARCHIVED');
ALTER TABLE "Task" ALTER COLUMN "archiveReason" TYPE "TaskArchiveReason_new" USING ("archiveReason"::text::"TaskArchiveReason_new");
ALTER TYPE "TaskArchiveReason" RENAME TO "TaskArchiveReason_old";
ALTER TYPE "TaskArchiveReason_new" RENAME TO "TaskArchiveReason";
DROP TYPE "TaskArchiveReason_old";
COMMIT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "qualityScore" INTEGER,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_statusId_idx" ON "Task"("statusId");

-- CreateIndex
CREATE INDEX "Task_priorityId_idx" ON "Task"("priorityId");

-- CreateIndex
CREATE INDEX "Task_isArchived_idx" ON "Task"("isArchived");

-- CreateIndex
CREATE INDEX "Task_archivedById_idx" ON "Task"("archivedById");
