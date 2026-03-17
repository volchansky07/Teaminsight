-- AlterTable
ALTER TABLE "TaskReport" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
