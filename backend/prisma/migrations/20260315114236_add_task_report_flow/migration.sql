-- CreateEnum
CREATE TYPE "TaskReportType" AS ENUM ('TEXT', 'LINK', 'FILE', 'IMAGE');

-- CreateEnum
CREATE TYPE "TaskReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "reportType" "TaskReportType",
ADD COLUMN     "requiresReport" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskReport" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reportType" "TaskReportType" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TaskReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "managerComment" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskReport_taskId_idx" ON "TaskReport"("taskId");

-- CreateIndex
CREATE INDEX "TaskReport_authorId_idx" ON "TaskReport"("authorId");

-- CreateIndex
CREATE INDEX "TaskReport_reviewedById_idx" ON "TaskReport"("reviewedById");

-- AddForeignKey
ALTER TABLE "TaskReport" ADD CONSTRAINT "TaskReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReport" ADD CONSTRAINT "TaskReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReport" ADD CONSTRAINT "TaskReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
