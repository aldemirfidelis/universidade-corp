import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CourseStatus,
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  UpdateCourseInput,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, status?: CourseStatus) {
    return this.prisma.course.findMany({
      where: { companyId, deletedAt: null, status: status || undefined },
      include: {
        instructor: { select: { id: true, name: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFull(companyId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        instructor: { select: { id: true, name: true } },
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: { video: true, materials: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Treinamento não encontrado');
    return course;
  }

  create(companyId: string, dto: CreateCourseInput, createdBy?: string) {
    return this.prisma.course.create({
      data: {
        companyId,
        title: dto.title,
        code: dto.code ?? null,
        revisionDate: dto.revisionDate ?? null,
        description: dto.description ?? null,
        objective: dto.objective ?? null,
        targetAudience: dto.targetAudience ?? null,
        category: dto.category ?? null,
        instructorId: dto.instructorId ?? null,
        departmentId: dto.departmentId ?? null,
        workloadHours: dto.workloadHours ?? null,
        validityMonths: dto.validityMonths ?? null,
        mandatory: dto.mandatory ?? false,
        modality: dto.modality,
        requiresExam: dto.requiresExam ?? false,
        coverUrl: dto.coverUrl ?? null,
        tags: dto.tags ?? [],
        prerequisiteCourseIds: dto.prerequisiteCourseIds ?? [],
        createdBy: createdBy ?? null,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCourseInput) {
    await this.ensure(companyId, id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async publish(companyId: string, id: string) {
    const course = await this.getFull(companyId, id);
    const lessons = course.modules.flatMap((m) => m.lessons);
    if (lessons.length === 0) {
      throw new BadRequestException('Adicione ao menos uma aula antes de publicar');
    }
    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async archive(companyId: string, id: string) {
    await this.ensure(companyId, id);
    return this.prisma.course.update({ where: { id }, data: { status: CourseStatus.ARCHIVED } });
  }

  async remove(companyId: string, id: string) {
    await this.ensure(companyId, id);
    await this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  // ---- Módulos ----
  async createModule(companyId: string, courseId: string, dto: CreateModuleInput) {
    await this.ensure(companyId, courseId);
    return this.prisma.courseModule.create({
      data: { companyId, courseId, title: dto.title, description: dto.description ?? null, order: dto.order },
    });
  }

  async deleteModule(companyId: string, moduleId: string) {
    await this.prisma.courseModule.updateMany({
      where: { id: moduleId, companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // ---- Aulas ----
  async createLesson(companyId: string, moduleId: string, dto: CreateLessonInput) {
    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, companyId, deletedAt: null },
    });
    if (!mod) throw new NotFoundException('Módulo não encontrado');
    return this.prisma.courseLesson.create({
      data: {
        companyId,
        moduleId,
        courseId: mod.courseId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        order: dto.order,
        mandatory: dto.mandatory,
        contentText: dto.contentText ?? null,
      },
    });
  }

  async deleteLesson(companyId: string, lessonId: string) {
    await this.prisma.courseLesson.updateMany({
      where: { id: lessonId, companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  private async ensure(companyId: string, id: string) {
    const c = await this.prisma.course.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!c) throw new NotFoundException('Treinamento não encontrado');
    return c;
  }
}
