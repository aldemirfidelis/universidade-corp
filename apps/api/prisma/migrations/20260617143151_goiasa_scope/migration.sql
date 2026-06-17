-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "code" TEXT,
ADD COLUMN     "revisionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "area" TEXT,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "TrainingMatrix" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingMatrix_companyId_idx" ON "TrainingMatrix"("companyId");

-- CreateIndex
CREATE INDEX "TrainingMatrix_positionId_idx" ON "TrainingMatrix"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingMatrix_positionId_courseId_key" ON "TrainingMatrix"("positionId", "courseId");

-- AddForeignKey
ALTER TABLE "TrainingMatrix" ADD CONSTRAINT "TrainingMatrix_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingMatrix" ADD CONSTRAINT "TrainingMatrix_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
