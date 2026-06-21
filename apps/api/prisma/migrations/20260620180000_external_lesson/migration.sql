-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'EXTERNAL';

-- AlterTable
ALTER TABLE "CourseLesson" ADD COLUMN     "externalUrl" TEXT;
