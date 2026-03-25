/*
  Warnings:

  - You are about to drop the column `qualityScore` on the `Task` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TaskArchiveReason" AS ENUM ('MANUAL', 'AUTO');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropIndex
DROP INDEX "Task_assigneeId_idx";

-- DropIndex
DROP INDEX "Task_priorityId_idx";

-- DropIndex
DROP INDEX "Task_projectId_idx";

-- DropIndex
DROP INDEX "Task_statusId_idx";

-- DropIndex
DROP INDEX "User_organizationId_idx";

-- DropIndex
DROP INDEX "User_roleId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "qualityScore",
ADD COLUMN     "archiveReason" "TaskArchiveReason",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
