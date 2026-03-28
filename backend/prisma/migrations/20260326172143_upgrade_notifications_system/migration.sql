/*
  Warnings:

  - The values [REPORT_ASSIGNED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_REJECTED', 'TASK_ASSIGNED', 'TASK_STARTED', 'TASK_UPDATED', 'TASK_DEADLINE_SOON', 'TASK_OVERDUE', 'PROJECT_ASSIGNED', 'TASK_RESTORED', 'PROJECT_ARCHIVED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deadlineNotifiedDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "overdueNotified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "meta" JSONB;
