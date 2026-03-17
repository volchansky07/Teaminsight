-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenExp" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;
