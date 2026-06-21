import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BADGES, BADGE_BY_CODE, levelInfo } from './badges';

const POINTS = {
  LESSON_COMPLETED: 10,
  COURSE_COMPLETED: 100,
  EXAM_PASSED: 50,
};

function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Garante o perfil de gamificação do usuário. */
  private async ensureProfile(companyId: string, userId: string) {
    return this.prisma.gamificationProfile.upsert({
      where: { userId },
      create: { companyId, userId },
      update: {},
    });
  }

  /** Adiciona pontos de forma idempotente (quando refId é informado). */
  private async addPoints(companyId: string, userId: string, type: string, points: number, refId?: string) {
    if (refId) {
      const existing = await this.prisma.pointEvent.findFirst({ where: { userId, type, refId } });
      if (existing) return;
    }
    await this.prisma.pointEvent.create({ data: { companyId, userId, type, points, refId: refId ?? null } });
    await this.prisma.gamificationProfile.upsert({
      where: { userId },
      create: { companyId, userId, points },
      update: { points: { increment: points } },
    });
  }

  /** Atualiza o streak diário com base na última atividade. */
  private async registerActivity(companyId: string, userId: string) {
    const profile = await this.ensureProfile(companyId, userId);
    const now = new Date();
    const today = dayNumber(now);
    const last = profile.lastActivityDate ? dayNumber(profile.lastActivityDate) : null;

    let currentStreak = profile.currentStreak;
    if (last === null) currentStreak = 1;
    else if (today === last) return profile; // já registrou hoje
    else if (today - last === 1) currentStreak += 1;
    else currentStreak = 1;

    const longestStreak = Math.max(profile.longestStreak, currentStreak);
    const updated = await this.prisma.gamificationProfile.update({
      where: { userId },
      data: { currentStreak, longestStreak, lastActivityDate: now },
    });
    if (currentStreak >= 7) await this.awardBadge(companyId, userId, 'STREAK_7');
    return updated;
  }

  private async awardBadge(companyId: string, userId: string, code: string) {
    const existing = await this.prisma.userBadge.findUnique({ where: { userId_code: { userId, code } } });
    if (existing) return;
    await this.prisma.userBadge.create({ data: { companyId, userId, code } });
    const def = BADGE_BY_CODE.get(code);
    await this.prisma.notification.create({
      data: {
        companyId,
        userId,
        type: 'GENERAL',
        title: 'Nova conquista! 🏅',
        body: def ? `Você desbloqueou "${def.name}": ${def.description}` : 'Você desbloqueou uma conquista.',
        linkUrl: '/conquistas',
      },
    });
  }

  // ---------------- hooks chamados por outros módulos ----------------

  async awardLessonCompleted(companyId: string, userId: string, lessonId: string) {
    await this.ensureProfile(companyId, userId);
    await this.registerActivity(companyId, userId);
    await this.addPoints(companyId, userId, 'LESSON_COMPLETED', POINTS.LESSON_COMPLETED, lessonId);
  }

  async awardCourseCompleted(companyId: string, userId: string, courseId: string) {
    await this.ensureProfile(companyId, userId);
    await this.addPoints(companyId, userId, 'COURSE_COMPLETED', POINTS.COURSE_COMPLETED, courseId);
    const completed = await this.prisma.enrollment.count({
      where: { companyId, userId, status: EnrollmentStatus.COMPLETED },
    });
    if (completed >= 1) await this.awardBadge(companyId, userId, 'FIRST_COURSE');
    if (completed >= 5) await this.awardBadge(companyId, userId, 'FIVE_COURSES');
    if (completed >= 10) await this.awardBadge(companyId, userId, 'TEN_COURSES');
  }

  async awardExamPassed(companyId: string, userId: string, courseId: string, score: number) {
    await this.ensureProfile(companyId, userId);
    await this.addPoints(companyId, userId, 'EXAM_PASSED', POINTS.EXAM_PASSED, `exam:${courseId}`);
    if (score >= 100) await this.awardBadge(companyId, userId, 'PERFECT_EXAM');
  }

  // ---------------- consultas ----------------

  async getProfile(companyId: string, userId: string) {
    const profile = await this.ensureProfile(companyId, userId);
    const earned = await this.prisma.userBadge.findMany({ where: { userId } });
    const earnedMap = new Map(earned.map((b) => [b.code, b.awardedAt]));
    const rank =
      (await this.prisma.gamificationProfile.count({
        where: { companyId, points: { gt: profile.points } },
      })) + 1;

    return {
      points: profile.points,
      ...levelInfo(profile.points),
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      rank,
      badges: BADGES.map((b) => ({
        ...b,
        earned: earnedMap.has(b.code),
        awardedAt: earnedMap.get(b.code) ?? null,
      })),
    };
  }

  async getLeaderboard(companyId: string, userId: string, scope: 'company' | 'team') {
    let userFilter: { id?: { in: string[] } } = {};
    if (scope === 'team') {
      const team = await this.prisma.user.findMany({
        where: { companyId, deletedAt: null, OR: [{ managerId: userId }, { id: userId }] },
        select: { id: true },
      });
      userFilter = { id: { in: team.map((u) => u.id) } };
    }

    const profiles = await this.prisma.gamificationProfile.findMany({
      where: { companyId, points: { gt: 0 }, user: { deletedAt: null, ...userFilter } },
      orderBy: { points: 'desc' },
      take: 20,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return profiles.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      points: p.points,
      level: levelInfo(p.points).level,
      isMe: p.userId === userId,
    }));
  }
}
