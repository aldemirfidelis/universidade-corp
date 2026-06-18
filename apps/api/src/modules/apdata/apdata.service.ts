import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import {
  CourseModality,
  CourseStatus,
  EnrollmentStatus,
  NotificationType,
  UserAccessStatus,
  UserRole,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

type SheetRow = Record<string, unknown>;

export interface ImportResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  skipped: number;
  errors: string[];
  processing?: boolean;
}

const IMPORT_CONCURRENCY = 10;
const STALE_IMPORT_MS = 12 * 60 * 60 * 1000;

interface EmployeeRow {
  externalEmployeeId: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  pisPasep: string | null;
  birthDate: Date | null;
  gender: string | null;
  admissionDate: Date | null;
  city: string | null;
  vacancyId: string | null;
  local: string | null;
  payroll: string | null;
  structureCode: string | null;
  costCenter: string | null;
  positionExternalId: string | null;
  positionName: string | null;
  areaExternalId: string | null;
  areaName: string | null;
  immediateSupervisor: string | null;
  managerName: string | null;
  employmentStatus: string | null;
  statusStartDate: Date | null;
  scheduleDescription: string | null;
  contractType: string | null;
  phone: string | null;
  immediateSupervisorHierarchy: string | null;
  hierarchyId: string | null;
  hierarchy: string | null;
  hierarchyStructureCode: string | null;
  parentHierarchyId: string | null;
  parentHierarchyDescription: string | null;
  parentHierarchyCostCenter: string | null;
}

interface TrainingRow {
  sourceKey: string;
  externalEmployeeId: string;
  employeeName: string;
  employmentStatus: string | null;
  admissionDate: Date | null;
  positionExternalId: string | null;
  positionName: string | null;
  areaExternalId: string | null;
  areaName: string | null;
  managerName: string | null;
  immediateSupervisor: string | null;
  payroll: string | null;
  externalTrainingId: string;
  trainingTitle: string;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  validityDays: number | null;
  validUntil: Date | null;
  workloadHours: number | null;
  externalStatus: string | null;
  realizedCount: number | null;
  revisionDate: Date | null;
  revisionNumber: string | null;
  revisionValidity: string | null;
  payrollAdjustment: string | null;
  pending: boolean;
}

@Injectable()
export class ApdataService {
  private readonly logger = new Logger(ApdataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importEmployees(companyId: string, file: Express.Multer.File, createdBy?: string) {
    return this.startImport(companyId, file, 'EMPLOYEES', createdBy, (batchId) =>
      this.processEmployeesImport(companyId, file, batchId, createdBy),
    );
  }

  private async processEmployeesImport(
    companyId: string,
    file: Express.Multer.File,
    batchId: string,
    createdBy?: string,
  ) {
    const rows = await readWorkbook(file);
    const result: ImportResult = emptyResult(batchId, rows.length);
    await this.saveBatchProgress(batchId, result);

    const parsed: EmployeeRow[] = [];
    const externalIds = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const employee = toEmployee(row);
      if (!employee.externalEmployeeId || !employee.name) {
        result.skipped += 1;
        result.errors.push(`Linha ${index + 2}: Id Contratado e Nome sao obrigatorios`);
        continue;
      }
      const empIdNum = parseInt(employee.externalEmployeeId, 10);
      if (isNaN(empIdNum) || empIdNum < 900000 || empIdNum > 999999) {
        result.skipped += 1;
        continue;
      }
      if (externalIds.has(employee.externalEmployeeId)) {
        result.skipped += 1;
        result.errors.push(`Linha ${index + 2}: Id Contratado duplicado`);
        continue;
      }
      externalIds.add(employee.externalEmployeeId);
      parsed.push(employee);
    }

    const positionByName = await this.ensurePositions(
      companyId,
      parsed.map((r) => r.positionName).filter(Boolean) as string[],
    );
    const departmentByName = await this.ensureDepartments(
      companyId,
      parsed.map((r) => r.areaName ?? r.payroll ?? r.local).filter(Boolean) as string[],
    );

    const existingRecords = await this.prisma.apdataEmployee.findMany({ where: { companyId } });
    const recordByExternalId = new Map(existingRecords.map((r) => [r.externalEmployeeId, r]));
    const existingUsers = await this.prisma.user.findMany({ where: { companyId } });
    const userById = new Map(existingUsers.map((u) => [u.id, u]));
    const userByRegistration = new Map(
      existingUsers.filter((u) => u.registration).map((u) => [u.registration!, u]),
    );
    const importedIds = new Set<string>();

    await mapInChunks(parsed, IMPORT_CONCURRENCY, async (employee) => {
      importedIds.add(employee.externalEmployeeId);
      const sourceHash = hash(employee);
      const departmentName = employee.areaName ?? employee.payroll ?? employee.local;
      const existingRecord = recordByExternalId.get(employee.externalEmployeeId);
      let user = existingRecord?.userId ? userById.get(existingRecord.userId) : undefined;
      user ??= userByRegistration.get(employee.externalEmployeeId);

      const userData = {
        name: employee.name,
        cpf: onlyDigits(employee.cpf),
        phone: employee.phone,
        registration: employee.externalEmployeeId,
        role: user?.role ?? UserRole.EMPLOYEE,
        departmentId: departmentName ? (departmentByName.get(normalizeName(departmentName)) ?? null) : null,
        positionId: employee.positionName ? (positionByName.get(normalizeName(employee.positionName)) ?? null) : null,
        area: employee.areaName,
        unit: employee.local ?? employee.payroll,
        admissionDate: employee.admissionDate,
        accessStatus: isActiveEmployment(employee.employmentStatus)
          ? (user?.accessStatus ?? UserAccessStatus.PENDING)
          : UserAccessStatus.INACTIVE,
        deletedAt: isActiveEmployment(employee.employmentStatus) ? null : (user?.deletedAt ?? new Date()),
      };

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            companyId,
            email: placeholderEmail(employee.externalEmployeeId),
            createdBy: createdBy ?? null,
            ...userData,
          },
        });
        userById.set(user.id, user);
        userByRegistration.set(employee.externalEmployeeId, user);
      } else {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: userData,
        });
        userById.set(user.id, user);
        userByRegistration.set(employee.externalEmployeeId, user);
      }

      const employeeData = {
        ...employee,
        companyId,
        userId: user.id,
        sourceHash,
        lastImportedAt: new Date(),
        deletedAt: null,
      };

      if (!existingRecord) {
        await this.prisma.apdataEmployee.create({ data: employeeData });
        result.created += 1;
      } else if (existingRecord.sourceHash === sourceHash && existingRecord.deletedAt === null) {
        await this.prisma.apdataEmployee.update({
          where: { id: existingRecord.id },
          data: { userId: user.id, lastImportedAt: new Date(), deletedAt: null },
        });
        result.unchanged += 1;
      } else {
        await this.prisma.apdataEmployee.update({
          where: { id: existingRecord.id },
          data: employeeData,
        });
        result.updated += 1;
      }
    }, () => this.saveBatchProgress(batchId, result));

    const removed = existingRecords.filter((r) => !importedIds.has(r.externalEmployeeId) && !r.deletedAt);
    await mapInChunks(removed, IMPORT_CONCURRENCY, async (record) => {
      await this.prisma.apdataEmployee.update({
        where: { id: record.id },
        data: { deletedAt: new Date(), lastImportedAt: new Date() },
      });
      if (record.userId) {
        await this.prisma.user.update({
          where: { id: record.userId },
          data: { accessStatus: UserAccessStatus.INACTIVE, deletedAt: new Date() },
        });
        await this.prisma.enrollment.updateMany({
          where: { companyId, userId: record.userId, status: EnrollmentStatus.ACTIVE },
          data: { status: EnrollmentStatus.CANCELLED },
        });
      }
      result.removed += 1;
    }, () => this.saveBatchProgress(batchId, result));

    await this.syncManagerLinks(companyId);
    await this.finishBatch(batchId, result);
    return result;
  }

  async importTrainingStatus(companyId: string, file: Express.Multer.File, createdBy?: string) {
    return this.startImport(companyId, file, 'TRAINING_STATUS', createdBy, (batchId) =>
      this.processTrainingStatusImport(companyId, file, batchId, createdBy),
    );
  }

  private async processTrainingStatusImport(
    companyId: string,
    file: Express.Multer.File,
    batchId: string,
    createdBy?: string,
  ) {
    const rows = await readWorkbook(file);
    const result: ImportResult = emptyResult(batchId, rows.length);
    await this.saveBatchProgress(batchId, result);

    const parsed: TrainingRow[] = [];
    const sourceKeys = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const training = toTraining(row);
      if (!training.externalEmployeeId || !training.externalTrainingId || !training.trainingTitle) {
        result.skipped += 1;
        result.errors.push(`Linha ${index + 2}: Id Contratado, Id Evento e Evento sao obrigatorios`);
        continue;
      }
      const empIdNum = parseInt(training.externalEmployeeId, 10);
      if (isNaN(empIdNum) || empIdNum < 900000 || empIdNum > 999999) {
        result.skipped += 1;
        continue;
      }
      if (sourceKeys.has(training.sourceKey)) {
        result.skipped += 1;
        result.errors.push(`Linha ${index + 2}: treinamento duplicado para colaborador/evento`);
        continue;
      }
      sourceKeys.add(training.sourceKey);
      parsed.push(training);
    }

    const employees = await this.prisma.apdataEmployee.findMany({
      where: { companyId, externalEmployeeId: { in: [...new Set(parsed.map((r) => r.externalEmployeeId))] } },
    });
    const employeeByExternalId = new Map(employees.map((e) => [e.externalEmployeeId, e]));
    const courseByExternalId = await this.ensureCourses(companyId, parsed, createdBy);
    const existingStatuses = await this.prisma.apdataTrainingStatus.findMany({ where: { companyId } });
    const statusBySourceKey = new Map(existingStatuses.map((s) => [s.sourceKey, s]));
    const importedKeys = new Set<string>();

    await mapInChunks(parsed, IMPORT_CONCURRENCY, async (training) => {
      const employee = employeeByExternalId.get(training.externalEmployeeId);
      if (!employee || employee.deletedAt || !employee.userId) {
        result.skipped += 1;
        return;
      }
      importedKeys.add(training.sourceKey);
      const course = courseByExternalId.get(training.externalTrainingId);
      const sourceHash = hash(training);
      const existing = statusBySourceKey.get(training.sourceKey);
      const statusData = {
        ...training,
        companyId,
        importBatchId: batchId,
        employeeRecordId: employee.id,
        userId: employee.userId,
        courseId: course?.id ?? null,
        sourceHash,
        lastImportedAt: new Date(),
        deletedAt: null,
      };

      if (!existing) {
        await this.prisma.apdataTrainingStatus.create({ data: statusData });
        result.created += 1;
      } else if (existing.sourceHash === sourceHash && existing.deletedAt === null) {
        await this.prisma.apdataTrainingStatus.update({
          where: { id: existing.id },
          data: {
            importBatchId: batchId,
            employeeRecordId: employee.id,
            userId: employee.userId,
            courseId: course?.id ?? null,
            lastImportedAt: new Date(),
            deletedAt: null,
          },
        });
        result.unchanged += 1;
      } else {
        await this.prisma.apdataTrainingStatus.update({
          where: { id: existing.id },
          data: statusData,
        });
        result.updated += 1;
      }
    }, () => this.saveBatchProgress(batchId, result));

    const removed = existingStatuses.filter((s) => !importedKeys.has(s.sourceKey) && !s.deletedAt);
    await mapInChunks(removed, IMPORT_CONCURRENCY, async (status) => {
      await this.prisma.apdataTrainingStatus.update({
        where: { id: status.id },
        data: { deletedAt: new Date(), lastImportedAt: new Date() },
      });
      if (status.userId && status.courseId) {
        await this.prisma.enrollment.updateMany({
          where: {
            companyId,
            userId: status.userId,
            courseId: status.courseId,
            sourceSystem: 'APDATA',
            sourceReferenceId: status.id,
            status: EnrollmentStatus.ACTIVE,
          },
          data: { status: EnrollmentStatus.CANCELLED },
        });
      }
      result.removed += 1;
    }, () => this.saveBatchProgress(batchId, result));

    await this.finishBatch(batchId, result);
    return result;
  }

  async pendingOverview(companyId: string) {
    const [statuses, batches] = await Promise.all([
      this.prisma.apdataTrainingStatus.findMany({
        where: {
          companyId,
          pending: true,
          deletedAt: null,
          user: { deletedAt: null },
        },
        include: {
          course: { select: { id: true, title: true, status: true } },
          user: { select: { id: true, name: true, registration: true } },
        },
        orderBy: [{ areaName: 'asc' }, { immediateSupervisor: 'asc' }, { trainingTitle: 'asc' }],
      }),
      this.prisma.apdataImportBatch.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    const groups = new Map<string, {
      area: string;
      areaValue: string | null;
      immediateSupervisor: string;
      immediateSupervisorValue: string | null;
      managerName: string;
      managerNameValue: string | null;
      pending: number;
      undispatched: number;
      dispatched: number;
      employees: Set<string>;
      courses: Set<string>;
    }>();

    for (const status of statuses) {
      const area = status.areaName ?? 'Sem area';
      const immediateSupervisor = status.immediateSupervisor ?? 'Sem superior';
      const managerName = status.managerName ?? 'Sem gestor';
      const key = `${area}__${immediateSupervisor}__${managerName}`;
      const group = groups.get(key) ?? {
        area,
        areaValue: status.areaName,
        immediateSupervisor,
        immediateSupervisorValue: status.immediateSupervisor,
        managerName,
        managerNameValue: status.managerName,
        pending: 0,
        undispatched: 0,
        dispatched: 0,
        employees: new Set<string>(),
        courses: new Set<string>(),
      };
      group.pending += 1;
      if (status.dispatchedAt) group.dispatched += 1;
      else group.undispatched += 1;
      if (status.userId) group.employees.add(status.userId);
      if (status.courseId) group.courses.add(status.courseId);
      groups.set(key, group);
    }

    return {
      totals: {
        pending: statuses.length,
        undispatched: statuses.filter((s) => !s.dispatchedAt).length,
        dispatched: statuses.filter((s) => !!s.dispatchedAt).length,
      },
      groups: [...groups.values()].map((g) => ({
        area: g.area,
        areaValue: g.areaValue,
        immediateSupervisor: g.immediateSupervisor,
        immediateSupervisorValue: g.immediateSupervisorValue,
        managerName: g.managerName,
        managerNameValue: g.managerNameValue,
        pending: g.pending,
        undispatched: g.undispatched,
        dispatched: g.dispatched,
        employees: g.employees.size,
        courses: g.courses.size,
      })),
      recent: statuses.slice(0, 25).map((s) => ({
        id: s.id,
        employee: s.user?.name ?? s.employeeName,
        registration: s.user?.registration ?? s.externalEmployeeId,
        training: s.course?.title ?? s.trainingTitle,
        status: s.externalStatus,
        revisionValidity: s.revisionValidity,
        area: s.areaName,
        immediateSupervisor: s.immediateSupervisor,
        managerName: s.managerName,
        validUntil: s.validUntil,
        dispatchedAt: s.dispatchedAt,
      })),
      batches,
    };
  }

  async dispatchPending(
    companyId: string,
    filters: { area?: string; immediateSupervisor?: string; managerName?: string; requirementIds?: string[] },
  ) {
    const where = {
      companyId,
      pending: true,
      deletedAt: null,
      dispatchedAt: null,
      areaName: filters.area || undefined,
      immediateSupervisor: filters.immediateSupervisor || undefined,
      managerName: filters.managerName || undefined,
      id: filters.requirementIds?.length ? { in: filters.requirementIds } : undefined,
      user: { deletedAt: null },
    };
    const statuses = await this.prisma.apdataTrainingStatus.findMany({
      where,
      include: { user: true, course: true },
    });

    const result = { dispatched: 0, skipped: 0 };
    for (const status of statuses) {
      if (!status.userId || !status.courseId || !status.course || status.course.status === CourseStatus.ARCHIVED) {
        result.skipped += 1;
        continue;
      }

      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: status.userId, courseId: status.courseId } },
      });
      if (existing?.status === EnrollmentStatus.COMPLETED) {
        await this.prisma.lessonProgress.deleteMany({
          where: { companyId, userId: status.userId, courseId: status.courseId },
        });
        await this.prisma.courseProgress.updateMany({
          where: { companyId, userId: status.userId, courseId: status.courseId },
          data: { status: 'NOT_STARTED', percent: 0, completedLessons: 0, completedAt: null },
        });
      }

      await this.prisma.enrollment.upsert({
        where: { userId_courseId: { userId: status.userId, courseId: status.courseId } },
        create: {
          companyId,
          userId: status.userId,
          courseId: status.courseId,
          mandatory: true,
          dueDate: dueDateFromStatus(status.validUntil),
          sourceSystem: 'APDATA',
          sourceReferenceId: status.id,
        },
        update: {
          mandatory: true,
          status: EnrollmentStatus.ACTIVE,
          completedAt: null,
          dueDate: dueDateFromStatus(status.validUntil),
          sourceSystem: 'APDATA',
          sourceReferenceId: status.id,
        },
      });

      await this.prisma.notification.create({
        data: {
          companyId,
          userId: status.userId,
          type: NotificationType.NEW_COURSE,
          title: 'Treinamento pendente',
          body: `O treinamento "${status.trainingTitle}" foi atribuido a voce.`,
          linkUrl: `/treinamento/${status.courseId}`,
        },
      });
      await this.prisma.apdataTrainingStatus.update({
        where: { id: status.id },
        data: { dispatchedAt: new Date() },
      });
      result.dispatched += 1;
    }

    return result;
  }

  async listBatches(companyId: string) {
    return this.prisma.apdataImportBatch.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async startImport(
    companyId: string,
    file: Express.Multer.File,
    type: 'EMPLOYEES' | 'TRAINING_STATUS',
    createdBy: string | undefined,
    handler: (batchId: string) => Promise<ImportResult>,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie uma planilha Excel');

    await this.closeStaleImports(companyId);
    const running = await this.prisma.apdataImportBatch.findFirst({
      where: { companyId, finishedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (running) {
      throw new BadRequestException('Aguarde a importacao APDATA em andamento finalizar antes de iniciar outra');
    }

    const batch = await this.prisma.apdataImportBatch.create({
      data: {
        companyId,
        type,
        fileName: file.originalname,
        totalRows: 0,
        createdBy: createdBy ?? null,
      },
    });

    setImmediate(() => {
      void handler(batch.id).catch(async (error) => {
        try {
          await this.failBatch(batch.id, error);
        } catch (failError) {
          const message = failError instanceof Error ? failError.message : String(failError);
          this.logger.error(`Falha ao registrar erro da importacao APDATA ${batch.id}: ${message}`);
        }
      });
    });

    return { ...emptyResult(batch.id, 0), processing: true };
  }

  private async closeStaleImports(companyId: string) {
    const staleBefore = new Date(Date.now() - STALE_IMPORT_MS);
    await this.prisma.apdataImportBatch.updateMany({
      where: { companyId, finishedAt: null, createdAt: { lt: staleBefore } },
      data: {
        finishedAt: new Date(),
        errorRows: ['Importacao interrompida antes de finalizar. Reenvie a planilha.'],
      },
    });
  }

  private async ensurePositions(companyId: string, names: string[]) {
    const existing = await this.prisma.position.findMany({ where: { companyId, deletedAt: null } });
    const byName = new Map(existing.map((p) => [normalizeName(p.name), p.id]));
    for (const name of uniqueClean(names)) {
      const key = normalizeName(name);
      if (byName.has(key)) continue;
      const created = await this.prisma.position.create({ data: { companyId, name } });
      byName.set(key, created.id);
    }
    return byName;
  }

  private async ensureDepartments(companyId: string, names: string[]) {
    const existing = await this.prisma.department.findMany({ where: { companyId, deletedAt: null } });
    const byName = new Map(existing.map((d) => [normalizeName(d.name), d.id]));
    for (const name of uniqueClean(names)) {
      const key = normalizeName(name);
      if (byName.has(key)) continue;
      const created = await this.prisma.department.create({ data: { companyId, name } });
      byName.set(key, created.id);
    }
    return byName;
  }

  private async ensureCourses(companyId: string, rows: TrainingRow[], createdBy?: string) {
    const uniqueByTraining = new Map<string, TrainingRow>();
    for (const row of rows) {
      if (!uniqueByTraining.has(row.externalTrainingId)) uniqueByTraining.set(row.externalTrainingId, row);
    }
    const ids = [...uniqueByTraining.keys()];
    const existing = await this.prisma.course.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ externalTrainingId: { in: ids } }, { code: { in: ids } }],
      },
    });
    const byExternalId = new Map(existing.filter((c) => c.externalTrainingId).map((c) => [c.externalTrainingId!, c]));
    const byCode = new Map(existing.filter((c) => c.code).map((c) => [c.code!, c]));
    const result = new Map<string, { id: string; status: string }>();

    await mapInChunks([...uniqueByTraining.entries()], IMPORT_CONCURRENCY, async ([externalTrainingId, row]) => {
      const course = byExternalId.get(externalTrainingId) ?? byCode.get(externalTrainingId);
      const validityMonths = row.validityDays ? Math.max(1, Math.round(row.validityDays / 30)) : null;
      if (course) {
        const updated = await this.prisma.course.update({
          where: { id: course.id },
          data: {
            externalTrainingId,
            sourceSystem: 'APDATA',
            code: course.code ?? externalTrainingId,
            title: course.title || row.trainingTitle,
            workloadHours: course.workloadHours ?? row.workloadHours,
            validityMonths: course.validityMonths ?? validityMonths,
            mandatory: true,
          },
        });
        result.set(externalTrainingId, updated);
        return;
      }
      const created = await this.prisma.course.create({
        data: {
          companyId,
          externalTrainingId,
          sourceSystem: 'APDATA',
          code: externalTrainingId,
          title: row.trainingTitle,
          workloadHours: row.workloadHours,
          validityMonths,
          mandatory: true,
          modality: CourseModality.ONLINE,
          requiresExam: true,
          status: CourseStatus.PUBLISHED,
          publishedAt: new Date(),
          createdBy: createdBy ?? null,
        },
      });
      result.set(externalTrainingId, created);
    });
    return result;
  }

  private async syncManagerLinks(companyId: string) {
    const records = await this.prisma.apdataEmployee.findMany({
      where: { companyId, deletedAt: null, userId: { not: null } },
      select: {
        userId: true,
        name: true,
        immediateSupervisor: true,
        managerName: true,
      },
    });
    const userIdByName = new Map<string, string>();
    for (const record of records) {
      if (record.userId) userIdByName.set(normalizeName(record.name), record.userId);
    }

    const managerIds = new Set<string>();
    const reportIdsByManagerId = new Map<string, string[]>();
    for (const record of records) {
      if (!record.userId) continue;
      const managerName = record.immediateSupervisor ?? record.managerName;
      if (!managerName) continue;
      const managerId = userIdByName.get(normalizeName(managerName));
      if (!managerId || managerId === record.userId) continue;
      managerIds.add(managerId);
      const reportIds = reportIdsByManagerId.get(managerId);
      if (reportIds) reportIds.push(record.userId);
      else reportIdsByManagerId.set(managerId, [record.userId]);
    }
    await mapInChunks([...reportIdsByManagerId.entries()], IMPORT_CONCURRENCY, async ([managerId, userIds]) => {
      await this.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { managerId },
      });
    });
    if (managerIds.size) {
      await this.prisma.user.updateMany({
        where: { id: { in: [...managerIds] }, role: UserRole.EMPLOYEE },
        data: { role: UserRole.MANAGER },
      });
    }
  }

  private async saveBatchProgress(batchId: string, result: ImportResult) {
    await this.prisma.apdataImportBatch.update({
      where: { id: batchId },
      data: {
        totalRows: result.totalRows,
        createdRows: result.created,
        updatedRows: result.updated,
        unchangedRows: result.unchanged,
        removedRows: result.removed,
        skippedRows: result.skipped,
        errorRows: result.errors.slice(0, 100),
      },
    });
  }

  private async finishBatch(batchId: string, result: ImportResult) {
    await this.prisma.apdataImportBatch.update({
      where: { id: batchId },
      data: {
        totalRows: result.totalRows,
        createdRows: result.created,
        updatedRows: result.updated,
        unchangedRows: result.unchanged,
        removedRows: result.removed,
        skippedRows: result.skipped,
        errorRows: result.errors.slice(0, 100),
        finishedAt: new Date(),
      },
    });
  }

  private async failBatch(batchId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Falha na importacao APDATA ${batchId}: ${message}`, stack);

    const batch = await this.prisma.apdataImportBatch.findUnique({
      where: { id: batchId },
      select: { errorRows: true },
    });
    const currentErrors = Array.isArray(batch?.errorRows) ? batch.errorRows.map(String) : [];
    await this.prisma.apdataImportBatch.update({
      where: { id: batchId },
      data: {
        errorRows: [...currentErrors, `Falha geral: ${message}`].slice(0, 100),
        finishedAt: new Date(),
      },
    });
  }
}

async function readWorkbook(file: Express.Multer.File): Promise<SheetRow[]> {
  if (!file?.buffer?.length) throw new BadRequestException('Envie uma planilha Excel');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('A planilha nao possui abas');

  const headers = sheet.getRow(1).values as unknown[];
  const seenHeaders = new Map<string, number>();
  const normalizedHeaders = headers.map((h) => {
    const base = normalizeHeader(cellText(h));
    if (!base) return '';
    const count = seenHeaders.get(base) ?? 0;
    seenHeaders.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
  const rows: SheetRow[] = [];

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    if (rowIndex % 500 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    const row = sheet.getRow(rowIndex);
    if (!row.hasValues) continue;

    const record: SheetRow = {};
    let hasValue = false;
    for (let col = 1; col < normalizedHeaders.length; col += 1) {
      const key = normalizedHeaders[col];
      if (!key) continue;
      const value = row.getCell(col).value;
      if (cellText(value)) hasValue = true;
      record[key] = value;
    }
    if (hasValue) rows.push(record);
  }
  return rows;
}

async function mapInChunks<T>(
  items: T[],
  chunkSize: number,
  worker: (item: T) => Promise<void>,
  afterChunk?: () => Promise<void>,
) {
  let lastProgressTime = Date.now();
  for (let index = 0; index < items.length; index += chunkSize) {
    await Promise.all(items.slice(index, index + chunkSize).map(worker));
    await new Promise((resolve) => setImmediate(resolve));

    if (afterChunk) {
      const now = Date.now();
      if (now - lastProgressTime > 5000 || index + chunkSize >= items.length) {
        await afterChunk();
        lastProgressTime = now;
      }
    }
  }
}

function toEmployee(row: SheetRow): EmployeeRow {
  return {
    externalEmployeeId: cleanString(pick(row, 'idcontratado')) ?? '',
    name: cleanString(pick(row, 'nome')) ?? '',
    cpf: cleanString(pick(row, 'cadastrodepessoafisica')),
    rg: cleanString(pick(row, 'numerodoregistrogeralrg')),
    pisPasep: cleanString(pick(row, 'pispasepnumero')),
    birthDate: dateValue(pick(row, 'datadonascimento')),
    gender: cleanString(pick(row, 'sexo')),
    admissionDate: dateValue(pick(row, 'datadaadmissao')),
    city: cleanString(pick(row, 'municipio')),
    vacancyId: cleanString(pick(row, 'idvaga')),
    local: cleanString(pick(row, 'local')),
    payroll: cleanString(pick(row, 'folha')),
    structureCode: cleanString(pick(row, 'codigodeestrutura')),
    costCenter: cleanString(pick(row, 'centrodecustorelativo')),
    positionExternalId: cleanString(pick(row, 'idcargo')),
    positionName: cleanString(pick(row, 'cargo')),
    areaExternalId: cleanString(pick(row, 'idareadeatuacao')),
    areaName: cleanString(pick(row, 'areadeatuacao')),
    immediateSupervisor: cleanString(pick(row, 'superiorimediato')),
    managerName: cleanString(pick(row, 'gestor')),
    employmentStatus: cleanString(pick(row, 'situacao')),
    statusStartDate: dateValue(pick(row, 'datainicionasituacao')),
    scheduleDescription: cleanString(pick(row, 'descricao')),
    contractType: cleanString(pick(row, 'tipocontrato')),
    phone: cleanString(pick(row, 'telefonenumero')),
    immediateSupervisorHierarchy: cleanString(pick(row, 'superiorimediatohie')),
    hierarchyId: cleanString(pick(row, 'idhierarquia')),
    hierarchy: cleanString(pick(row, 'hierarquia')),
    hierarchyStructureCode: cleanString(pick(row, 'codigodeestrutura_2')),
    parentHierarchyId: cleanString(pick(row, 'idhiesup')),
    parentHierarchyDescription: cleanString(pick(row, 'dsshiesup')),
    parentHierarchyCostCenter: cleanString(pick(row, 'coshiesup')),
  };
}

function toTraining(row: SheetRow): TrainingRow {
  const externalEmployeeId = cleanString(pick(row, 'idcontratado')) ?? '';
  const externalTrainingId = cleanString(pick(row, 'idevento')) ?? '';
  const externalStatus = cleanString(pick(row, 'status'));
  const revisionValidity = cleanString(pick(row, 'validadtrevisao'));
  const training = {
    sourceKey: `${externalEmployeeId}:${externalTrainingId}`,
    externalEmployeeId,
    employeeName: cleanString(pick(row, 'nome')) ?? '',
    employmentStatus: cleanString(pick(row, 'situacao')),
    admissionDate: dateValue(pick(row, 'datadaadmissao')),
    positionExternalId: cleanString(pick(row, 'idcargo')),
    positionName: cleanString(pick(row, 'cargo')),
    areaExternalId: cleanString(pick(row, 'idareadeatuacao')),
    areaName: cleanString(pick(row, 'areadeatuacao')),
    managerName: cleanString(pick(row, 'gestor')),
    immediateSupervisor: cleanString(pick(row, 'superior')),
    payroll: cleanString(pick(row, 'folha')),
    externalTrainingId,
    trainingTitle: cleanString(pick(row, 'evento')) ?? '',
    eventStartAt: dateValue(pick(row, 'datahorainiciodoevento')),
    eventEndAt: dateValue(pick(row, 'datahorafimdoevento')),
    validityDays: intValue(pick(row, 'quantidadedediasdevalidade')),
    validUntil: dateValue(pick(row, 'validade')),
    workloadHours: numberValue(pick(row, 'quantidadecargahorariatotal')),
    externalStatus,
    realizedCount: numberValue(pick(row, 'realizado')),
    revisionDate: dateValue(pick(row, 'dtrevisao')),
    revisionNumber: cleanString(pick(row, 'numrefrevisao')),
    revisionValidity,
    payrollAdjustment: cleanString(pick(row, 'ajustedefolha')),
    pending: isPendingTraining(externalStatus, revisionValidity),
  };
  return training;
}

function pick(row: SheetRow, key: string): unknown {
  return row[key];
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const objectValue = value as { text?: string; richText?: Array<{ text: string }>; result?: unknown };
    if (objectValue.text) return objectValue.text;
    if (objectValue.richText) return objectValue.richText.map((p) => p.text).join('');
    if (objectValue.result != null) return cellText(objectValue.result);
  }
  return String(value).trim();
}

function cleanString(value: unknown): string | null {
  const text = cellText(value).replace(/\s+/g, ' ').trim();
  if (!text || text === '?') return null;
  return text;
}

function numberValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cleanString(value);
  if (!text) return null;
  const parsed = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed == null ? null : Math.round(parsed);
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = cleanString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeHeader(value: string): string {
  const base = removeDiacritics(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  return HEADER_ALIASES[base] ?? base;
}

const HEADER_ALIASES: Record<string, string> = {
  superiorimediato: 'superiorimediato',
  superiorimediatohie: 'superiorimediatohie',
  dtrevisao: 'dtrevisao',
  numrefrevisao: 'numrefrevisao',
  validadtrevisao: 'validadtrevisao',
  ajustedefolha: 'ajustedefolha',
};

function normalizeName(value: string): string {
  return removeDiacritics(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function onlyDigits(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
}

function uniqueClean(values: string[]): string[] {
  const out = new Map<string, string>();
  for (const value of values) {
    const cleaned = cleanString(value);
    if (!cleaned) continue;
    out.set(normalizeName(cleaned), cleaned);
  }
  return [...out.values()];
}

function hash(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

function emptyResult(batchId: string, totalRows: number): ImportResult {
  return { batchId, totalRows, created: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0, errors: [] };
}

function placeholderEmail(externalEmployeeId: string): string {
  return `apdata-${externalEmployeeId}@goiasa.local`;
}

function isActiveEmployment(status: string | null): boolean {
  if (!status) return true;
  const normalized = normalizeName(status);
  return normalized.includes('atividade') && !normalized.includes('deslig');
}

function isPendingTraining(status: string | null, revisionValidity: string | null): boolean {
  const normalizedStatus = normalizeName(status ?? '');
  const normalizedRevision = normalizeName(revisionValidity ?? '');
  return (
    normalizedStatus.includes('vencido') ||
    normalizedStatus.includes('proximo') ||
    normalizedRevision.includes('desatualizado')
  );
}

function dueDateFromStatus(validUntil: Date | null): Date | null {
  if (!validUntil) return null;
  return validUntil < new Date() ? new Date() : validUntil;
}
