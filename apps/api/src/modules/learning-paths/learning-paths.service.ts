import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, LearningPathInput, ProgressStatus } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LearningPathsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.learningPath.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { courses: true } } },
    });
  }

  async get(companyId: string, id: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: { course: { select: { id: true, title: true, coverUrl: true, status: true } } },
        },
      },
    });
    if (!path) throw new NotFoundException('Trilha não encontrada');
    return path;
  }

  create(companyId: string, dto: LearningPathInput) {
    return this.prisma.learningPath.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description ?? null,
        mandatory: dto.mandatory ?? false,
      },
    });
  }

  async update(companyId: string, id: string, dto: LearningPathInput) {
    await this.ensure(companyId, id);
    return this.prisma.learningPath.update({
      where: { id },
      data: { title: dto.title, description: dto.description ?? null, mandatory: dto.mandatory ?? false },
    });
  }

  async setCourses(companyId: string, id: string, courseIds: string[]) {
    await this.ensure(companyId, id);
    // Mantém apenas cursos válidos da empresa, preservando a ordem enviada.
    const valid = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    const validSet = new Set(valid.map((c) => c.id));
    const ordered = courseIds.filter((cid) => validSet.has(cid));

    await this.prisma.learningPathCourse.deleteMany({ where: { pathId: id } });
    if (ordered.length) {
      await this.prisma.learningPathCourse.createMany({
        data: ordered.map((courseId, i) => ({ companyId, pathId: id, courseId, order: i })),
      });
    }
    return this.get(companyId, id);
  }

  async publish(companyId: string, id: string) {
    await this.ensure(companyId, id);
    return this.prisma.learningPath.update({ where: { id }, data: { status: CourseStatus.PUBLISHED } });
  }

  async remove(companyId: string, id: string) {
    await this.ensure(companyId, id);
    await this.prisma.learningPath.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  /** Trilhas publicadas com o progresso do colaborador. */
  async forLearner(companyId: string, userId: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: { course: { select: { id: true, title: true, coverUrl: true } } },
        },
      },
    });

    const progresses = await this.prisma.courseProgress.findMany({
      where: { companyId, userId },
      select: { courseId: true, status: true, percent: true },
    });
    const byCourse = new Map(progresses.map((p) => [p.courseId, p]));

    return paths
      .map((p) => {
        const courses = p.courses.map((pc) => {
          const prog = byCourse.get(pc.course.id);
          return {
            id: pc.course.id,
            title: pc.course.title,
            coverUrl: pc.course.coverUrl,
            completed: prog?.status === ProgressStatus.COMPLETED,
            percent: prog?.percent ?? 0,
          };
        });
        const completed = courses.filter((c) => c.completed).length;
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          mandatory: p.mandatory,
          total: courses.length,
          completed,
          percent: courses.length ? Math.round((completed / courses.length) * 100) : 0,
          courses,
        };
      })
      .filter((p) => p.total > 0);
  }

  private async ensure(companyId: string, id: string) {
    const path = await this.prisma.learningPath.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!path) throw new NotFoundException('Trilha não encontrada');
    return path;
  }
}
