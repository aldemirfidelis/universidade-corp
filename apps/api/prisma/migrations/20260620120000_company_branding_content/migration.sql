-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "guidelines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroTitle" TEXT,
ADD COLUMN     "missionText" TEXT,
ADD COLUMN     "visionText" TEXT;
