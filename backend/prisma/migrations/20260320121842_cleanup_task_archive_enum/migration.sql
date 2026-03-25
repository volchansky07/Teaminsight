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
