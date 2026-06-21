import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CourseStatus,
  LessonProgressInput,
  ProgressStatus,
  watchedPercent,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../common/env';
import { CompletionService } from '../completion/completion.service';
import { MatrixService } from '../matrix/matrix.service';
import { ValidityService } from '../validity/validity.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: CompletionService,
    private readonly matrix: MatrixService,
    private readonly validity: ValidityService,
    private readonly gamification: GamificationService,
  ) {}

  /** "Meus Treinamentos": matrículas + progresso + validade. */
  async myCourses(companyId: string, userId: string) {
    // Garante matrícula automática nos obrigatórios e na matriz do cargo.
    await this.autoEnrollMandatory(companyId, userId);
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { positionId: true } });
    await this.matrix.enrollUserMatrix(companyId, userId, me?.positionId ?? null);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { companyId, userId, course: { deletedAt: null } },
      include: { course: { select: { id: true, title: true, code: true, coverUrl: true, workloadHours: true, mandatory: true, requiresExam: true } } },
      orderBy: { enrolledAt: 'desc' },
    });

    const progresses = await this.prisma.courseProgress.findMany({ where: { companyId, userId } });
    const byCourse = new Map(progresses.map((p) => [p.courseId, p]));
    const validity = await this.validity.forUser(companyId, userId);

    return enrollments.map((e) => {
      const v = validity.get(e.courseId);
      return {
        enrollmentId: e.id,
        status: e.status,
        mandatory: e.mandatory || e.course.mandatory,
        dueDate: e.dueDate,
        course: e.course,
        progress: byCourse.get(e.courseId)?.percent ?? 0,
        progressStatus: byCourse.get(e.courseId)?.status ?? ProgressStatus.NOT_STARTED,
        validity: v?.status ?? 'NONE',
        validUntil: v?.validUntil ?? null,
        needsRetraining: v?.status === 'EXPIRED',
      };
    });
  }

  /** Painel do colaborador: pendentes, vencidos, próximos vencimentos, concluídos. */
  async dashboard(companyId: string, userId: string) {
    const courses = await this.myCourses(companyId, userId);
    const concluidos = courses.filter(
      (c) => c.progressStatus === ProgressStatus.COMPLETED && c.validity !== 'EXPIRED',
    );
    const vencidos = courses.filter((c) => c.validity === 'EXPIRED');
    const proximosVencimentos = courses
      .filter((c) => c.validity === 'EXPIRING')
      .sort((a, b) => (a.validUntil?.getTime() ?? 0) - (b.validUntil?.getTime() ?? 0));
    const pendentes = courses.filter(
      (c) => c.progressStatus !== ProgressStatus.COMPLETED || c.validity === 'EXPIRED',
    );

    await this.notifyExpirations(companyId, userId, vencidos, proximosVencimentos);

    return {
      totals: {
        pendentes: pendentes.length,
        concluidos: concluidos.length,
        vencidos: vencidos.length,
        proximosVencimentos: proximosVencimentos.length,
      },
      pendentes,
      vencidos,
      proximosVencimentos,
      historico: courses,
    };
  }

  /** Refazer treinamento (retreinamento por vencimento): zera o progresso. */
  async restartCourse(companyId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, companyId, deletedAt: null } });
    if (!course) throw new NotFoundException('Treinamento não encontrado');
    await this.prisma.lessonProgress.deleteMany({ where: { companyId, userId, courseId } });
    await this.prisma.courseProgress.updateMany({
      where: { companyId, userId, courseId },
      data: { status: ProgressStatus.NOT_STARTED, percent: 0, completedLessons: 0, completedAt: null },
    });
    await this.prisma.enrollment.updateMany({
      where: { companyId, userId, courseId },
      data: { status: 'ACTIVE', completedAt: null },
    });
    return { ok: true };
  }

  /** Dados do player: curso + aulas + progresso por aula. */
  async courseForStudent(companyId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, companyId, deletedAt: null },
      include: {
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

    await this.ensureEnrollment(companyId, userId, courseId, course.mandatory);

    const progress = await this.prisma.lessonProgress.findMany({
      where: { companyId, userId, courseId },
    });
    const byLesson = new Map(progress.map((p) => [p.lessonId, p]));

    const modules = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => {
        const p = byLesson.get(l.id);
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          mandatory: l.mandatory,
          contentText: l.contentText,
          externalUrl: l.externalUrl,
          hasVideo: !!l.video,
          durationSeconds: l.video?.durationSeconds ?? 0,
          materials: l.materials.map((mat) => ({ id: mat.id, title: mat.title, path: mat.storedPath })),
          status: p?.status ?? ProgressStatus.NOT_STARTED,
          watchedPercent: p?.watchedPercent ?? 0,
          lastPositionSeconds: p?.lastPositionSeconds ?? 0,
        };
      }),
    }));

    const courseProgress = await this.prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      requiresExam: course.requiresExam,
      workloadHours: course.workloadHours,
      progress: courseProgress?.percent ?? 0,
      status: courseProgress?.status ?? ProgressStatus.NOT_STARTED,
      modules,
    };
  }

  /** Registra progresso de uma aula em vídeo e dispara recálculo/conclusão. */
  async recordProgress(
    companyId: string,
    userId: string,
    lessonId: string,
    dto: LessonProgressInput,
    ip?: string,
    device?: string,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, companyId, deletedAt: null },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');

    const threshold = await this.threshold(companyId);
    const pct = watchedPercent(dto.watchedSeconds, dto.totalSeconds);
    const completed = pct >= threshold;

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    // Nunca regride um progresso já concluído.
    const alreadyCompleted = existing?.status === ProgressStatus.COMPLETED;
    const status = alreadyCompleted || completed ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        companyId,
        userId,
        lessonId,
        courseId: lesson.courseId,
        watchedSeconds: Math.round(dto.watchedSeconds),
        totalSeconds: Math.round(dto.totalSeconds),
        watchedPercent: pct,
        lastPositionSeconds: Math.round(dto.lastPositionSeconds ?? dto.watchedSeconds),
        status,
        startedAt: new Date(),
        completedAt: status === ProgressStatus.COMPLETED ? new Date() : null,
        ip: ip ?? null,
        device: device ?? null,
      },
      update: {
        watchedSeconds: Math.max(existing?.watchedSeconds ?? 0, Math.round(dto.watchedSeconds)),
        totalSeconds: Math.round(dto.totalSeconds),
        watchedPercent: Math.max(existing?.watchedPercent ?? 0, pct),
        lastPositionSeconds: Math.round(dto.lastPositionSeconds ?? dto.watchedSeconds),
        status,
        completedAt:
          status === ProgressStatus.COMPLETED ? existing?.completedAt ?? new Date() : null,
      },
    });

    // Gamificação: pontua quando a aula é concluída pela 1ª vez (best-effort).
    if (status === ProgressStatus.COMPLETED && !alreadyCompleted) {
      try {
        await this.gamification.awardLessonCompleted(companyId, userId, lessonId);
      } catch {
        /* gamificação é best-effort */
      }
    }

    const courseState = await this.recalcCourse(companyId, userId, lesson.courseId);
    return { lessonStatus: status, watchedPercent: pct, ...courseState };
  }

  /** Catálogo: treinamentos publicados da empresa, com status de matrícula do usuário. */
  async catalog(companyId: string, userId: string) {
    const courses = await this.prisma.course.findMany({
      where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        code: true,
        coverUrl: true,
        category: true,
        description: true,
        workloadHours: true,
        mandatory: true,
        requiresExam: true,
      },
      orderBy: { title: 'asc' },
    });

    const [enrollments, progresses] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { companyId, userId }, select: { courseId: true } }),
      this.prisma.courseProgress.findMany({ where: { companyId, userId }, select: { courseId: true, percent: true, status: true } }),
    ]);
    const enrolledSet = new Set(enrollments.map((e) => e.courseId));
    const progressByCourse = new Map(progresses.map((p) => [p.courseId, p]));

    return courses.map((c) => ({
      ...c,
      enrolled: enrolledSet.has(c.id),
      progress: progressByCourse.get(c.id)?.percent ?? 0,
      progressStatus: progressByCourse.get(c.id)?.status ?? ProgressStatus.NOT_STARTED,
    }));
  }

  /** Recomendações personalizadas (cargo/matriz, obrigatórios, afinidade de categoria). */
  async recommendations(companyId: string, userId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { positionId: true } });

    const [enrollments, matrix, completed] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { companyId, userId }, select: { courseId: true } }),
      me?.positionId
        ? this.prisma.trainingMatrix.findMany({ where: { companyId, positionId: me.positionId }, select: { courseId: true } })
        : Promise.resolve([] as { courseId: string }[]),
      this.prisma.courseProgress.findMany({
        where: { companyId, userId, status: ProgressStatus.COMPLETED },
        select: { courseId: true },
      }),
    ]);

    const enrolledIds = enrollments.map((e) => e.courseId);
    const matrixIds = new Set(matrix.map((m) => m.courseId));
    const completedIds = completed.map((c) => c.courseId);
    const completedCourses = completedIds.length
      ? await this.prisma.course.findMany({ where: { id: { in: completedIds } }, select: { category: true } })
      : [];
    const likedCategories = new Set(completedCourses.map((c) => c.category).filter(Boolean) as string[]);

    const candidates = await this.prisma.course.findMany({
      where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED, id: { notIn: enrolledIds } },
      select: {
        id: true,
        title: true,
        code: true,
        coverUrl: true,
        category: true,
        workloadHours: true,
        mandatory: true,
        requiresExam: true,
      },
    });

    const scored = candidates.map((c) => {
      let score = 0;
      let reason = 'Disponível no catálogo';
      if (matrixIds.has(c.id)) {
        score += 5;
        reason = 'Recomendado para o seu cargo';
      }
      if (c.mandatory) {
        score += 3;
        if (score === 3) reason = 'Obrigatório';
      }
      if (c.category && likedCategories.has(c.category)) {
        score += 2;
        if (!matrixIds.has(c.id) && !c.mandatory) reason = 'Combina com seus interesses';
      }
      return { course: c, score, reason };
    });

    return scored
      .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
      .slice(0, 6)
      .map((s) => ({ ...s.course, reason: s.reason }));
  }

  /** Auto-inscrição do colaborador em um treinamento publicado. */
  async selfEnroll(companyId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, companyId, deletedAt: null, status: CourseStatus.PUBLISHED },
    });
    if (!course) throw new NotFoundException('Treinamento não encontrado ou não publicado');
    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { companyId, userId, courseId, mandatory: course.mandatory },
      update: {},
    });
    return { ok: true };
  }

  async myCertificates(companyId: string, userId: string) {
    return this.prisma.certificate.findMany({
      where: { companyId, userId },
      include: { course: { select: { title: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  // ---------------- internos ----------------

  /** Gera notificações in-app de vencimento (dedup por curso para evitar spam). */
  private async notifyExpirations(
    companyId: string,
    userId: string,
    vencidos: Array<{ course: { title: string } }>,
    proximos: Array<{ course: { title: string } }>,
  ) {
    const existing = await this.prisma.notification.findMany({
      where: { companyId, userId, readAt: null, type: { in: ['OVERDUE', 'DUE_SOON'] } },
      select: { body: true },
    });
    const seen = new Set(existing.map((n) => n.body));
    const toCreate: Array<{ type: 'OVERDUE' | 'DUE_SOON'; title: string; body: string }> = [];

    for (const v of vencidos) {
      const body = `O treinamento "${v.course.title}" está vencido. Refaça para manter sua certificação.`;
      if (!seen.has(body)) toCreate.push({ type: 'OVERDUE', title: 'Treinamento vencido', body });
    }
    for (const p of proximos) {
      const body = `O treinamento "${p.course.title}" está próximo do vencimento.`;
      if (!seen.has(body)) toCreate.push({ type: 'DUE_SOON', title: 'Vencimento próximo', body });
    }
    if (toCreate.length) {
      await this.prisma.notification.createMany({
        data: toCreate.map((n) => ({ companyId, userId, type: n.type, title: n.title, body: n.body })),
      });
    }
  }

  private async threshold(companyId: string): Promise<number> {
    const s = await this.prisma.companySettings.findUnique({ where: { companyId } });
    return s?.videoCompletionThreshold ?? env.videoCompletionThreshold;
  }

  private async ensureEnrollment(
    companyId: string,
    userId: string,
    courseId: string,
    mandatory: boolean,
  ) {
    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { companyId, userId, courseId, mandatory },
      update: {},
    });
  }

  private async autoEnrollMandatory(companyId: string, userId: string) {
    const mandatoryCourses = await this.prisma.course.findMany({
      where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED, mandatory: true },
      select: { id: true },
    });
    for (const c of mandatoryCourses) {
      await this.prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: c.id } },
        create: { companyId, userId, courseId: c.id, mandatory: true },
        update: {},
      });
    }
  }

  /** Recalcula o progresso do curso; conclui automaticamente quando não há prova. */
  private async recalcCourse(companyId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { modules: { where: { deletedAt: null }, include: { lessons: { where: { deletedAt: null } } } } },
    });
    if (!course) return { coursePercent: 0, courseCompleted: false };

    const mandatoryLessons = course.modules
      .flatMap((m) => m.lessons)
      .filter((l) => l.mandatory);
    const totalLessons = course.modules.flatMap((m) => m.lessons).length;

    const completedProgress = await this.prisma.lessonProgress.findMany({
      where: { companyId, userId, courseId, status: ProgressStatus.COMPLETED },
      select: { lessonId: true },
    });
    const completedIds = new Set(completedProgress.map((p) => p.lessonId));
    const completedCount = completedIds.size;

    const allMandatoryDone =
      mandatoryLessons.length > 0 && mandatoryLessons.every((l) => completedIds.has(l.id));
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const courseCompleted = allMandatoryDone && !course.requiresExam;
    const status = courseCompleted
      ? ProgressStatus.COMPLETED
      : completedCount > 0
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;

    await this.prisma.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        companyId,
        userId,
        courseId,
        completedLessons: completedCount,
        totalLessons,
        percent,
        status,
        startedAt: new Date(),
        completedAt: courseCompleted ? new Date() : null,
      },
      update: {
        completedLessons: completedCount,
        totalLessons,
        percent,
        status,
        completedAt: courseCompleted ? new Date() : null,
      },
    });

    if (courseCompleted) {
      await this.completion.completeCourse(companyId, userId, course.id);
    }

    return { coursePercent: percent, courseCompleted, examUnlocked: allMandatoryDone && course.requiresExam };
  }
}
