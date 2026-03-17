/*
  Warnings:

  - The values [planned,active,paused,completed] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `roleInProject` column on the `ProjectMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[kpiConfigId,metricName]` on the table `KPIMetricWeight` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `metricName` on the `KPIMetricWeight` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "KPIMetricName" AS ENUM ('PRODUCTIVITY', 'QUALITY', 'DEADLINES', 'WORKLOAD_BALANCE', 'CONTRIBUTION');

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "ProjectStatus_old";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- AlterTable
ALTER TABLE "KPIConfiguration" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "KPIMetricWeight" DROP COLUMN "metricName",
ADD COLUMN     "metricName" "KPIMetricName" NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN "roleInProject",
ADD COLUMN     "roleInProject" "ProjectRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TimeLog" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmployeeKPI_userId_idx" ON "EmployeeKPI"("userId");

-- CreateIndex
CREATE INDEX "EmployeeKPI_projectId_idx" ON "EmployeeKPI"("projectId");

-- CreateIndex
CREATE INDEX "EmployeeKPI_periodStart_periodEnd_idx" ON "EmployeeKPI"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "KPIConfiguration_organizationId_idx" ON "KPIConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "KPIConfiguration_isActive_idx" ON "KPIConfiguration"("isActive");

-- CreateIndex
CREATE INDEX "KPIMetricWeight_kpiConfigId_idx" ON "KPIMetricWeight"("kpiConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "KPIMetricWeight_kpiConfigId_metricName_key" ON "KPIMetricWeight"("kpiConfigId", "metricName");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "ProjectMetric_projectId_idx" ON "ProjectMetric"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMetric_periodStart_periodEnd_idx" ON "ProjectMetric"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Task_priorityId_idx" ON "Task"("priorityId");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "TimeLog_taskId_idx" ON "TimeLog"("taskId");

-- CreateIndex
CREATE INDEX "TimeLog_userId_idx" ON "TimeLog"("userId");

-- CreateIndex
CREATE INDEX "TimeLog_logDate_idx" ON "TimeLog"("logDate");
