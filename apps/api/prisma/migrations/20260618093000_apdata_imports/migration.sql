-- APDATA spreadsheet imports: parent employee base and child training status base.

ALTER TABLE "Course"
ADD COLUMN "externalTrainingId" TEXT,
ADD COLUMN "sourceSystem" TEXT;

ALTER TABLE "Enrollment"
ADD COLUMN "sourceSystem" TEXT,
ADD COLUMN "sourceReferenceId" TEXT;

CREATE TABLE "ApdataImportBatch" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileName" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "createdRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0,
  "unchangedRows" INTEGER NOT NULL DEFAULT 0,
  "removedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "ApdataImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApdataEmployee" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT,
  "externalEmployeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cpf" TEXT,
  "rg" TEXT,
  "pisPasep" TEXT,
  "birthDate" TIMESTAMP(3),
  "gender" TEXT,
  "admissionDate" TIMESTAMP(3),
  "city" TEXT,
  "vacancyId" TEXT,
  "local" TEXT,
  "payroll" TEXT,
  "structureCode" TEXT,
  "costCenter" TEXT,
  "positionExternalId" TEXT,
  "positionName" TEXT,
  "areaExternalId" TEXT,
  "areaName" TEXT,
  "immediateSupervisor" TEXT,
  "managerName" TEXT,
  "employmentStatus" TEXT,
  "statusStartDate" TIMESTAMP(3),
  "scheduleDescription" TEXT,
  "contractType" TEXT,
  "phone" TEXT,
  "immediateSupervisorHierarchy" TEXT,
  "hierarchyId" TEXT,
  "hierarchy" TEXT,
  "hierarchyStructureCode" TEXT,
  "parentHierarchyId" TEXT,
  "parentHierarchyDescription" TEXT,
  "parentHierarchyCostCenter" TEXT,
  "sourceHash" TEXT NOT NULL,
  "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ApdataEmployee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApdataTrainingStatus" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "importBatchId" TEXT,
  "employeeRecordId" TEXT,
  "userId" TEXT,
  "courseId" TEXT,
  "sourceKey" TEXT NOT NULL,
  "externalEmployeeId" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "employmentStatus" TEXT,
  "admissionDate" TIMESTAMP(3),
  "positionExternalId" TEXT,
  "positionName" TEXT,
  "areaExternalId" TEXT,
  "areaName" TEXT,
  "managerName" TEXT,
  "immediateSupervisor" TEXT,
  "payroll" TEXT,
  "externalTrainingId" TEXT NOT NULL,
  "trainingTitle" TEXT NOT NULL,
  "eventStartAt" TIMESTAMP(3),
  "eventEndAt" TIMESTAMP(3),
  "validityDays" INTEGER,
  "validUntil" TIMESTAMP(3),
  "workloadHours" DOUBLE PRECISION,
  "externalStatus" TEXT,
  "realizedCount" DOUBLE PRECISION,
  "revisionDate" TIMESTAMP(3),
  "revisionNumber" TEXT,
  "revisionValidity" TEXT,
  "payrollAdjustment" TEXT,
  "pending" BOOLEAN NOT NULL DEFAULT false,
  "dispatchedAt" TIMESTAMP(3),
  "sourceHash" TEXT NOT NULL,
  "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ApdataTrainingStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_companyId_externalTrainingId_key" ON "Course"("companyId", "externalTrainingId");
CREATE INDEX "Enrollment_companyId_sourceSystem_idx" ON "Enrollment"("companyId", "sourceSystem");

CREATE INDEX "ApdataImportBatch_companyId_idx" ON "ApdataImportBatch"("companyId");
CREATE INDEX "ApdataImportBatch_companyId_type_idx" ON "ApdataImportBatch"("companyId", "type");
CREATE INDEX "ApdataImportBatch_createdAt_idx" ON "ApdataImportBatch"("createdAt");

CREATE UNIQUE INDEX "ApdataEmployee_userId_key" ON "ApdataEmployee"("userId");
CREATE UNIQUE INDEX "ApdataEmployee_companyId_externalEmployeeId_key" ON "ApdataEmployee"("companyId", "externalEmployeeId");
CREATE INDEX "ApdataEmployee_companyId_idx" ON "ApdataEmployee"("companyId");
CREATE INDEX "ApdataEmployee_companyId_areaName_idx" ON "ApdataEmployee"("companyId", "areaName");
CREATE INDEX "ApdataEmployee_companyId_immediateSupervisor_idx" ON "ApdataEmployee"("companyId", "immediateSupervisor");
CREATE INDEX "ApdataEmployee_companyId_managerName_idx" ON "ApdataEmployee"("companyId", "managerName");
CREATE INDEX "ApdataEmployee_deletedAt_idx" ON "ApdataEmployee"("deletedAt");

CREATE UNIQUE INDEX "ApdataTrainingStatus_companyId_sourceKey_key" ON "ApdataTrainingStatus"("companyId", "sourceKey");
CREATE INDEX "ApdataTrainingStatus_companyId_idx" ON "ApdataTrainingStatus"("companyId");
CREATE INDEX "ApdataTrainingStatus_companyId_pending_idx" ON "ApdataTrainingStatus"("companyId", "pending");
CREATE INDEX "ApdataTrainingStatus_companyId_areaName_idx" ON "ApdataTrainingStatus"("companyId", "areaName");
CREATE INDEX "ApdataTrainingStatus_companyId_immediateSupervisor_idx" ON "ApdataTrainingStatus"("companyId", "immediateSupervisor");
CREATE INDEX "ApdataTrainingStatus_companyId_managerName_idx" ON "ApdataTrainingStatus"("companyId", "managerName");
CREATE INDEX "ApdataTrainingStatus_companyId_externalEmployeeId_idx" ON "ApdataTrainingStatus"("companyId", "externalEmployeeId");
CREATE INDEX "ApdataTrainingStatus_companyId_externalTrainingId_idx" ON "ApdataTrainingStatus"("companyId", "externalTrainingId");
CREATE INDEX "ApdataTrainingStatus_deletedAt_idx" ON "ApdataTrainingStatus"("deletedAt");

ALTER TABLE "ApdataEmployee"
ADD CONSTRAINT "ApdataEmployee_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApdataTrainingStatus"
ADD CONSTRAINT "ApdataTrainingStatus_importBatchId_fkey"
FOREIGN KEY ("importBatchId") REFERENCES "ApdataImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApdataTrainingStatus"
ADD CONSTRAINT "ApdataTrainingStatus_employeeRecordId_fkey"
FOREIGN KEY ("employeeRecordId") REFERENCES "ApdataEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApdataTrainingStatus"
ADD CONSTRAINT "ApdataTrainingStatus_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApdataTrainingStatus"
ADD CONSTRAINT "ApdataTrainingStatus_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
