/*
  Warnings:

  - You are about to drop the column `joinedAt` on the `ProjectMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN "joinedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
