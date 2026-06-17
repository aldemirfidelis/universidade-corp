import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassInput, EnrollmentStatus, NotificationType } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.class.findMany({
      where: { companyId, deletedAt: null },
      include: {
        course: { select: { id: true, title: true } },
        instructor: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(companyId: string, id: string) {
    const turma = await this.prisma.class.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        course: { select: { id: true, title: true } },
        students: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!turma) throw new NotFoundException('Turma não encontrada');
    return turma;
  }

  async create(companyId: string, dto: CreateClassInput, createdBy?: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, companyId, deletedAt: null },
    });
    if (!course) throw new NotFoundException('Treinamento não encontrado');

    const turma = await this.prisma.class.create({
      data: {
        companyId,
        name: dto.name,
        courseId: dto.courseId,
        instructorId: dto.instructorId ?? null,
        dueDate: dto.dueDate ?? null,
        createdBy: createdBy ?? null,
      },
    });

    await this.enrollStudents(companyId, turma.id, dto.courseId, dto.studentIds, dto.dueDate, course.title);
    return this.getOne(companyId, turma.id);
  }

  /** Adiciona alunos por ids OU por departamento/cargo. */
  async addStudents(
    companyId: string,
    classId: string,
    body: { studentIds?: string[]; departmentId?: string; positionId?: string },
  ) {
    const turma = await this.prisma.class.findFirst({
      where: { id: classId, companyId, deletedAt: null },
      include: { course: { select: { id: true, title: true } } },
    });
    if (!turma) throw new NotFoundException('Turma não encontrada');

    let ids = body.studentIds ?? [];
    if (body.departmentId || body.positionId) {
      const byFilter = await this.prisma.user.findMany({
        where: {
          companyId,
          deletedAt: null,
          departmentId: body.departmentId || undefined,
          positionId: body.positionId || undefined,
        },
        select: { id: true },
      });
      ids = [...new Set([...ids, ...byFilter.map((u) => u.id)])];
    }

    await this.enrollStudents(companyId, classId, turma.courseId, ids, turma.dueDate, turma.course.title);
    return this.getOne(companyId, classId);
  }

  private async enrollStudents(
    companyId: string,
    classId: string,
    courseId: string,
    studentIds: string[],
    dueDate: Date | null | undefined,
    courseTitle: string,
  ) {
    for (const userId of studentIds) {
      await this.prisma.classStudent.upsert({
        where: { classId_userId: { classId, userId } },
        create: { companyId, classId, userId },
        update: {},
      });
      await this.prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: {
          companyId,
          userId,
          courseId,
          classId,
          status: EnrollmentStatus.ACTIVE,
          dueDate: dueDate ?? null,
        },
        update: { classId, dueDate: dueDate ?? undefined },
      });
      await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          type: NotificationType.NEW_COURSE,
          title: 'Novo treinamento disponível',
          body: `Você foi inscrito em "${courseTitle}".`,
        },
      });
    }
  }
}
