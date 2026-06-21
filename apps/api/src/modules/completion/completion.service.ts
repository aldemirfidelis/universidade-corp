import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, NotificationType } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { certificateCode } from '../../common/crypto';
import { GamificationService } from '../gamification/gamification.service';

/**
 * Conclusão de curso e emissão de certificado.
 * Compartilhado entre o fluxo de aulas (LearningService) e o de provas (AssessmentsService).
 */
@Injectable()
export class CompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  /** Marca matrícula concluída + gera certificado (idempotente). */
  async completeCourse(companyId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, companyId, deletedAt: null },
    });
    if (!course) return;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (enrollment?.status !== EnrollmentStatus.COMPLETED) {
      await this.prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: {
          companyId,
          userId,
          courseId,
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
        },
        update: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
      });
    }

    await this.prisma.courseProgress.updateMany({
      where: { companyId, userId, courseId },
      data: { status: 'COMPLETED', percent: 100, completedAt: new Date() },
    });

    const existing = await this.prisma.certificate.findFirst({
      where: { companyId, userId, courseId },
    });
    if (existing) return existing;

    const validUntil = course.validityMonths
      ? new Date(Date.now() + course.validityMonths * 30 * 24 * 3600_000)
      : null;

    const cert = await this.prisma.certificate.create({
      data: {
        companyId,
        userId,
        courseId,
        code: certificateCode(),
        workloadHours: course.workloadHours,
        validUntil,
      },
    });
    await this.prisma.notification.create({
      data: {
        companyId,
        userId,
        type: NotificationType.CERTIFICATE_ISSUED,
        title: 'Certificado liberado!',
        body: `Parabéns! Você concluiu "${course.title}".`,
      },
    });

    // Gamificação: pontos de conclusão + badges (não bloqueia o fluxo principal).
    try {
      await this.gamification.awardCourseCompleted(companyId, userId, courseId);
    } catch {
      /* gamificação é best-effort */
    }
    return cert;
  }
}
