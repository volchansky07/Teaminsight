/*
  Warnings:

  - You are about to drop the column `endDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Project` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProjectArchiveReason" AS ENUM ('COMPLETED', 'EMPTY', 'MANUAL');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_managerId_fkey";

-- DropIndex
DROP INDEX "Project_managerId_idx";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "endDate",
DROP COLUMN "managerId",
DROP COLUMN "startDate",
DROP COLUMN "status",
ADD COLUMN     "archiveReason" "ProjectArchiveReason",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_isArchived_idx" ON "Project"("isArchived");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
