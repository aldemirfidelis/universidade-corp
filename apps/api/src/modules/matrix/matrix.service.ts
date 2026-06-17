import { Injectable } from '@nestjs/common';
import { NotificationType } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Matriz de Treinamentos por cargo (Goiasa).
 * Ao associar um colaborador a um cargo, os treinamentos da matriz são
 * automaticamente disponibilizados (matrícula automática).
 */
@Injectable()
export class MatrixService {
  constructor(private readonly prisma: PrismaService) {}

  /** Matriz de um cargo: cursos obrigatórios. */
  async getByPosition(companyId: string, positionId: string) {
    return this.prisma.trainingMatrix.findMany({
      where: { companyId, positionId },
      include: { course: { select: { id: true, title: true, code: true, validityMonths: true } } },
    });
  }

  /** Visão completa: todos os cargos com seus treinamentos. */
  async overview(companyId: string) {
    const positions = await this.prisma.position.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    const entries = await this.prisma.trainingMatrix.findMany({
      where: { companyId },
      include: { course: { select: { id: true, title: true, code: true } } },
    });
    return positions.map((p) => ({
      positionId: p.id,
      positionName: p.name,
      courses: entries.filter((e) => e.positionId === p.id).map((e) => e.course),
    }));
  }

  /** Define os cursos da matriz de um cargo e re-sincroniza matrículas. */
  async setMatrix(companyId: string, positionId: string, courseIds: string[]) {
    const current = await this.prisma.trainingMatrix.findMany({ where: { companyId, positionId } });
    const currentIds = new Set(current.map((c) => c.courseId));
    const desired = new Set(courseIds);

    const toAdd = courseIds.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !desired.has(id));

    if (toRemove.length) {
      await this.prisma.trainingMatrix.deleteMany({
        where: { companyId, positionId, courseId: { in: toRemove } },
      });
    }
    for (const courseId of toAdd) {
      await this.prisma.trainingMatrix.create({ data: { companyId, positionId, courseId } });
    }

    // Re-aplica para todos os colaboradores deste cargo.
    const users = await this.prisma.user.findMany({
      where: { companyId, positionId, deletedAt: null },
      select: { id: true },
    });
    for (const u of users) await this.enrollUserMatrix(companyId, u.id, positionId);

    return this.getByPosition(companyId, positionId);
  }

  /**
   * Matricula um colaborador em todos os treinamentos da matriz do seu cargo.
   * Chamado ao criar/atualizar o cargo de um colaborador e no carregamento dos cursos.
   */
  async enrollUserMatrix(companyId: string, userId: string, positionId: string | null) {
    if (!positionId) return;
    const matrix = await this.prisma.trainingMatrix.findMany({
      where: { companyId, positionId },
      include: { course: { select: { id: true, title: true, status: true } } },
    });
    for (const m of matrix) {
      if (m.course.status !== 'PUBLISHED') continue;
      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: m.courseId } },
      });
      if (existing) continue;
      await this.prisma.enrollment.create({
        data: { companyId, userId, courseId: m.courseId, mandatory: true },
      });
      await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          type: NotificationType.NEW_COURSE,
          title: 'Novo treinamento atribuído',
          body: `O treinamento "${m.course.title}" foi atribuído ao seu cargo.`,
        },
      });
    }
  }
}
