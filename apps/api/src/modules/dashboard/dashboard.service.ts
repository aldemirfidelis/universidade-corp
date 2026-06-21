import { Injectable } from '@nestjs/common';
import { AttemptStatus, CourseStatus, EnrollmentStatus, ProgressStatus, UserRole } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidityService } from '../validity/validity.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validity: ValidityService,
  ) {}

  async companyOverview(companyId: string) {
    const [
      totalEmployees,
      publishedCourses,
      mandatoryCourses,
      totalEnrollments,
      completedEnrollments,
      certificates,
      courseProgresses,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { companyId, deletedAt: null, role: UserRole.EMPLOYEE },
      }),
      this.prisma.course.count({
        where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED },
      }),
      this.prisma.course.count({
        where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED, mandatory: true },
      }),
      this.prisma.enrollment.count({ where: { companyId } }),
      this.prisma.enrollment.count({ where: { companyId, status: EnrollmentStatus.COMPLETED } }),
      this.prisma.certificate.count({ where: { companyId } }),
      this.prisma.courseProgress.findMany({
        where: { companyId },
        select: { status: true, percent: true },
      }),
    ]);

    const started = courseProgresses.filter((p) => p.status !== ProgressStatus.NOT_STARTED).length;
    const overdue = await this.prisma.enrollment.count({
      where: {
        companyId,
        status: { not: EnrollmentStatus.COMPLETED },
        dueDate: { lt: new Date() },
      },
    });

    const adherence = totalEnrollments > 0 ? Math.round((started / totalEnrollments) * 100) : 0;
    const completion =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    const [scoreAgg, attempts, validitySummary, byArea] = await Promise.all([
      this.prisma.assessmentAttempt.aggregate({
        where: { companyId, score: { not: null } },
        _avg: { score: true },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { companyId, status: { in: [AttemptStatus.PASSED, AttemptStatus.FAILED] } },
        select: { status: true },
      }),
      this.validity.companySummary(companyId),
      this.completionByArea(companyId),
    ]);
    const approvalRate =
      attempts.length > 0
        ? Math.round((attempts.filter((a) => a.status === AttemptStatus.PASSED).length / attempts.length) * 100)
        : 0;

    return {
      totalEmployees,
      publishedCourses,
      mandatoryCourses,
      totalEnrollments,
      completedEnrollments,
      pendingEnrollments: totalEnrollments - completedEnrollments,
      certificates,
      overdue,
      adherence,
      completion,
      avgScore: Math.round(scoreAgg._avg.score ?? 0),
      approvalRate,
      validity: validitySummary, // { valid, expiring, expired }
      byArea, // [{ area, completed, total }]
      completionByMonth: await this.completionByMonth(companyId),
    };
  }

  /** Analytics avançado: funil, compliance, engajamento, por curso e por categoria. */
  async analytics(companyId: string) {
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000);
    const [enrollments, courses, progresses, overdue, recentProgress] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { companyId }, select: { courseId: true, status: true } }),
      this.prisma.course.findMany({
        where: { companyId, deletedAt: null, status: CourseStatus.PUBLISHED },
        select: { id: true, title: true, category: true, mandatory: true },
      }),
      this.prisma.courseProgress.findMany({ where: { companyId }, select: { status: true } }),
      this.prisma.enrollment.count({
        where: { companyId, status: { not: EnrollmentStatus.COMPLETED }, dueDate: { lt: new Date() } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { companyId, completedAt: { gte: since30 } },
        select: { userId: true },
      }),
    ]);

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const mandatorySet = new Set(courses.filter((c) => c.mandatory).map((c) => c.id));

    const total = enrollments.length;
    const completed = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
    const started = progresses.filter((p) => p.status !== ProgressStatus.NOT_STARTED).length;

    const mandatoryEnrollments = enrollments.filter((e) => mandatorySet.has(e.courseId));
    const mandatoryCompleted = mandatoryEnrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;

    const courseAgg = new Map<string, { total: number; completed: number }>();
    const catAgg = new Map<string, { total: number; completed: number }>();
    for (const e of enrollments) {
      const course = courseMap.get(e.courseId);
      if (!course) continue;
      const done = e.status === EnrollmentStatus.COMPLETED;

      const c = courseAgg.get(e.courseId) ?? { total: 0, completed: 0 };
      c.total += 1;
      if (done) c.completed += 1;
      courseAgg.set(e.courseId, c);

      const cat = course.category ?? 'Sem categoria';
      const k = catAgg.get(cat) ?? { total: 0, completed: 0 };
      k.total += 1;
      if (done) k.completed += 1;
      catAgg.set(cat, k);
    }

    const byCourse = [...courseAgg.entries()]
      .map(([id, v]) => ({
        title: courseMap.get(id)?.title ?? '—',
        total: v.total,
        completed: v.completed,
        rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const byCategory = [...catAgg.entries()].map(([category, v]) => ({ category, ...v }));
    const activeLearners = new Set(recentProgress.map((p) => p.userId)).size;

    return {
      funnel: { enrolled: total, started, completed },
      compliance: {
        rate: mandatoryEnrollments.length ? Math.round((mandatoryCompleted / mandatoryEnrollments.length) * 100) : 0,
        mandatoryEnrollments: mandatoryEnrollments.length,
        mandatoryCompleted,
      },
      overdue,
      activeLearners,
      byCourse,
      byCategory,
      completionByMonth: await this.completionByMonth(companyId),
    };
  }

  /** Painel do gestor: somente a equipe (subordinados diretos). */
  async teamOverview(companyId: string, managerId: string) {
    const team = await this.prisma.user.findMany({
      where: { companyId, managerId, deletedAt: null },
      select: { id: true, name: true },
    });
    const ids = team.map((t) => t.id);
    if (ids.length === 0) {
      return { teamSize: 0, trained: 0, pending: 0, expired: 0, adherence: 0, ranking: [] };
    }

    const [enrollments, progresses, validityByUser] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { companyId, userId: { in: ids } } }),
      this.prisma.courseProgress.findMany({ where: { companyId, userId: { in: ids } } }),
      Promise.all(ids.map(async (id) => [id, await this.validity.forUser(companyId, id)] as const)),
    ]);

    const total = enrollments.length;
    const completed = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
    const expired = [...validityByUser].reduce(
      (sum, [, m]) => sum + [...m.values()].filter((v) => v.status === 'EXPIRED').length,
      0,
    );

    // Ranking por % de conclusão individual.
    const progByUser = new Map<string, number[]>();
    for (const p of progresses) {
      const arr = progByUser.get(p.userId) ?? [];
      arr.push(p.percent);
      progByUser.set(p.userId, arr);
    }
    const ranking = team
      .map((t) => {
        const arr = progByUser.get(t.id) ?? [];
        const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        return { name: t.name, completion: avg };
      })
      .sort((a, b) => b.completion - a.completion);

    return {
      teamSize: team.length,
      trained: completed,
      pending: total - completed,
      expired,
      adherence: total > 0 ? Math.round((completed / total) * 100) : 0,
      ranking,
    };
  }

  /** Conclusões por Área (para gráfico de pizza). */
  private async completionByArea(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, area: true },
    });
    const areaByUser = new Map(users.map((u) => [u.id, u.area ?? 'Sem área']));
    const enrollments = await this.prisma.enrollment.findMany({
      where: { companyId },
      select: { userId: true, status: true },
    });
    const acc = new Map<string, { completed: number; total: number }>();
    for (const e of enrollments) {
      const area = areaByUser.get(e.userId) ?? 'Sem área';
      const cur = acc.get(area) ?? { completed: 0, total: 0 };
      cur.total += 1;
      if (e.status === EnrollmentStatus.COMPLETED) cur.completed += 1;
      acc.set(area, cur);
    }
    return [...acc.entries()].map(([area, v]) => ({ area, ...v }));
  }

  /** Conclusões dos últimos 6 meses (para gráfico). */
  private async completionByMonth(companyId: string) {
    const since = new Date();
    since.setMonth(since.getMonth() - 5, 1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.courseProgress.findMany({
      where: { companyId, status: ProgressStatus.COMPLETED, completedAt: { gte: since } },
      select: { completedAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      buckets.set(monthKey(d), 0);
    }
    for (const r of rows) {
      if (!r.completedAt) continue;
      const key = monthKey(r.completedAt);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([month, count]) => ({ month, count }));
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
