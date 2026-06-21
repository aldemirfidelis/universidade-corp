import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../auth/auth.types';

const EXPERT_ROLES: UserRole[] = [UserRole.INSTRUCTOR, UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN];
const MODERATOR_ROLES: UserRole[] = [UserRole.INSTRUCTOR, UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN];

interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}

function toDto(c: { id: string; userId: string; body: string; createdAt: Date; user: CommentAuthor }) {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: {
      id: c.user.id,
      name: c.user.name,
      avatarUrl: c.user.avatarUrl,
      isExpert: EXPERT_ROLES.includes(c.user.role),
    },
  };
}

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista as perguntas/comentários de uma aula em formato de thread (1 nível). */
  async list(companyId: string, lessonId: string) {
    const comments = await this.prisma.lessonComment.findMany({
      where: { companyId, lessonId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });

    const roots = comments.filter((c) => !c.parentId);
    const repliesByParent = new Map<string, typeof comments>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) ?? [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      }
    }
    // Replies órfãs (pai removido) sobem para a raiz para não sumirem da discussão.
    const orphanRoots = comments.filter((c) => c.parentId && !comments.some((p) => p.id === c.parentId));

    return [...roots, ...orphanRoots]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((root) => ({
        ...toDto(root),
        replies: (repliesByParent.get(root.id) ?? []).map(toDto),
      }));
  }

  async create(companyId: string, userId: string, lessonId: string, body: string, parentId?: string | null) {
    const text = (body ?? '').trim();
    if (!text) throw new BadRequestException('Escreva algo antes de enviar.');
    if (text.length > 2000) throw new BadRequestException('Comentário muito longo (máx. 2000 caracteres).');

    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, companyId, deletedAt: null },
      select: { id: true, courseId: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    const course = await this.prisma.course.findFirst({
      where: { id: lesson.courseId, companyId, deletedAt: null },
      select: { id: true, title: true, instructorId: true },
    });
    if (!course) throw new NotFoundException('Treinamento não encontrado');

    let parent: { id: string; userId: string } | null = null;
    if (parentId) {
      parent = await this.prisma.lessonComment.findFirst({
        where: { id: parentId, companyId, lessonId, deletedAt: null },
        select: { id: true, userId: true },
      });
      if (!parent) throw new NotFoundException('Comentário não encontrado');
    }

    const comment = await this.prisma.lessonComment.create({
      data: { companyId, courseId: course.id, lessonId, userId, parentId: parent?.id ?? null, body: text },
      include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });

    await this.notify(companyId, userId, course, parent);
    return toDto(comment);
  }

  async remove(companyId: string, user: AuthPayload, commentId: string) {
    const comment = await this.prisma.lessonComment.findFirst({
      where: { id: commentId, companyId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    const isOwner = comment.userId === user.sub;
    const isModerator = MODERATOR_ROLES.includes(user.role);
    if (!isOwner && !isModerator) throw new ForbiddenException('Sem permissão para remover este comentário.');

    await this.prisma.lessonComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  /** Notifica: resposta → autor do comentário-pai; pergunta nova → instrutor do curso. */
  private async notify(
    companyId: string,
    authorId: string,
    course: { id: string; title: string; instructorId: string | null },
    parent: { id: string; userId: string } | null,
  ) {
    const link = `/treinamento/${course.id}`;
    if (parent) {
      if (parent.userId !== authorId) {
        await this.prisma.notification.create({
          data: {
            companyId,
            userId: parent.userId,
            type: 'GENERAL',
            title: 'Responderam seu comentário',
            body: `Há uma nova resposta em "${course.title}".`,
            linkUrl: link,
          },
        });
      }
      return;
    }
    if (course.instructorId && course.instructorId !== authorId) {
      await this.prisma.notification.create({
        data: {
          companyId,
          userId: course.instructorId,
          type: 'GENERAL',
          title: 'Nova pergunta em um treinamento',
          body: `Um colaborador comentou em "${course.title}".`,
          linkUrl: link,
        },
      });
    }
  }
}
