import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentConfigInput,
  AttemptStatus,
  CreateQuestionInput,
  ProgressStatus,
  QuestionType,
  SubmitExamInput,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CompletionService } from '../completion/completion.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: CompletionService,
    private readonly gamification: GamificationService,
  ) {}

  // ---------------- Autoria (admin/instrutor) ----------------

  async getByCourse(companyId: string, courseId: string) {
    return this.prisma.assessment.findFirst({
      where: { companyId, courseId, deletedAt: null },
      include: { questions: { where: { deletedAt: null }, orderBy: { order: 'asc' }, include: { options: true } } },
    });
  }

  async upsertConfig(companyId: string, courseId: string, dto: AssessmentConfigInput) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, companyId, deletedAt: null } });
    if (!course) throw new NotFoundException('Treinamento não encontrado');
    // Garante que o curso exija prova.
    if (!course.requiresExam) {
      await this.prisma.course.update({ where: { id: courseId }, data: { requiresExam: true } });
    }
    const existing = await this.prisma.assessment.findFirst({ where: { companyId, courseId } });
    if (existing) {
      return this.prisma.assessment.update({ where: { id: existing.id }, data: dto });
    }
    return this.prisma.assessment.create({ data: { companyId, courseId, ...dto } });
  }

  async addQuestion(companyId: string, assessmentId: string, dto: CreateQuestionInput) {
    const assessment = await this.prisma.assessment.findFirst({ where: { id: assessmentId, companyId } });
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');
    if (!dto.options.some((o) => o.isCorrect)) {
      throw new BadRequestException('Marque ao menos uma alternativa correta');
    }
    const count = await this.prisma.question.count({ where: { assessmentId } });
    return this.prisma.question.create({
      data: {
        companyId,
        assessmentId,
        type: dto.type,
        statement: dto.statement,
        weight: dto.weight,
        imageUrl: dto.imageUrl ?? null,
        order: count,
        options: {
          create: dto.options.map((o, i) => ({
            companyId,
            text: o.text,
            isCorrect: o.isCorrect,
            order: i,
          })),
        },
      },
      include: { options: true },
    });
  }

  async deleteQuestion(companyId: string, questionId: string) {
    await this.prisma.question.updateMany({
      where: { id: questionId, companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // ---------------- Aluno ----------------

  async examState(companyId: string, userId: string, courseId: string) {
    const assessment = await this.getByCourse(companyId, courseId);
    if (!assessment) return { hasExam: false };

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { companyId, userId, assessmentId: assessment.id },
      orderBy: { attemptNumber: 'desc' },
    });
    const passed = attempts.some((a) => a.status === AttemptStatus.PASSED);
    const unlocked = await this.mandatoryLessonsDone(companyId, userId, courseId);

    return {
      hasExam: true,
      unlocked,
      passed,
      attemptsUsed: attempts.length,
      maxAttempts: assessment.maxAttempts,
      passingScore: assessment.passingScore,
      canAttempt: unlocked && !passed && attempts.length < assessment.maxAttempts,
      lastScore: attempts[0]?.score ?? null,
    };
  }

  /** Inicia uma tentativa e devolve as questões SEM o gabarito. */
  async startAttempt(companyId: string, userId: string, courseId: string) {
    const assessment = await this.getByCourse(companyId, courseId);
    if (!assessment) throw new NotFoundException('Este treinamento não possui prova');
    if (assessment.questions.length === 0) throw new BadRequestException('Prova sem questões');

    if (!(await this.mandatoryLessonsDone(companyId, userId, courseId))) {
      throw new ForbiddenException('Conclua todas as aulas obrigatórias antes da prova');
    }
    const used = await this.prisma.assessmentAttempt.count({
      where: { companyId, userId, assessmentId: assessment.id },
    });
    const alreadyPassed = await this.prisma.assessmentAttempt.findFirst({
      where: { companyId, userId, assessmentId: assessment.id, status: AttemptStatus.PASSED },
    });
    if (alreadyPassed) throw new BadRequestException('Você já foi aprovado nesta prova');
    if (used >= assessment.maxAttempts) throw new BadRequestException('Limite de tentativas atingido');

    const attempt = await this.prisma.assessmentAttempt.create({
      data: { companyId, userId, assessmentId: assessment.id, attemptNumber: used + 1 },
    });

    let questions = assessment.questions.map((q) => ({
      id: q.id,
      type: q.type,
      statement: q.statement,
      imageUrl: q.imageUrl,
      weight: q.weight,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    }));
    if (assessment.shuffleQuestions) questions = shuffle(questions);
    if (assessment.shuffleOptions) questions = questions.map((q) => ({ ...q, options: shuffle(q.options) }));

    return {
      attemptId: attempt.id,
      title: assessment.title,
      timeLimitMin: assessment.timeLimitMin,
      passingScore: assessment.passingScore,
      questions,
    };
  }

  /** Corrige a tentativa, calcula a nota e libera certificado se aprovado. */
  async submitAttempt(companyId: string, userId: string, attemptId: string, dto: SubmitExamInput) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, companyId, userId },
      include: { assessment: { include: { questions: { include: { options: true } } } } },
    });
    if (!attempt) throw new NotFoundException('Tentativa não encontrada');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Tentativa já finalizada');
    }

    const questions = attempt.assessment.questions.filter((q) => !q.deletedAt);
    const totalWeight = questions.reduce((s, q) => s + q.weight, 0) || 1;
    const answerMap = new Map(dto.answers.map((a) => [a.questionId, a]));

    let awarded = 0;
    for (const q of questions) {
      const ans = answerMap.get(q.id);
      const selected = new Set(ans?.selectedOptionIds ?? []);
      const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
      const isCorrect = gradeObjective(q.type, selected, correct);
      const score = isCorrect ? q.weight : 0;
      awarded += score;
      await this.prisma.assessmentAnswer.create({
        data: {
          companyId,
          attemptId,
          questionId: q.id,
          selectedOptionIds: [...selected],
          essayText: ans?.essayText ?? null,
          isCorrect,
          scoreAwarded: score,
        },
      });
    }

    const score = Math.round((awarded / totalWeight) * 100);
    const passed = score >= attempt.assessment.passingScore;

    await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        status: passed ? AttemptStatus.PASSED : AttemptStatus.FAILED,
        finishedAt: new Date(),
      },
    });

    let certificateIssued = false;
    if (passed) {
      try {
        await this.gamification.awardExamPassed(companyId, userId, attempt.assessment.courseId, score);
      } catch {
        /* gamificação é best-effort */
      }
      await this.completion.completeCourse(companyId, userId, attempt.assessment.courseId);
      certificateIssued = true;
    } else {
      await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          type: 'EXAM_FAILED',
          title: 'Prova reprovada',
          body: `Sua nota foi ${score}%. Revise o conteúdo e tente novamente.`,
        },
      });
    }

    return {
      score,
      passed,
      passingScore: attempt.assessment.passingScore,
      certificateIssued,
      showAnswers: attempt.assessment.showAnswers,
    };
  }

  private async mandatoryLessonsDone(companyId: string, userId: string, courseId: string) {
    const lessons = await this.prisma.courseLesson.findMany({
      where: { companyId, courseId, deletedAt: null, mandatory: true },
      select: { id: true },
    });
    if (lessons.length === 0) return true;
    const done = await this.prisma.lessonProgress.count({
      where: {
        companyId,
        userId,
        courseId,
        status: ProgressStatus.COMPLETED,
        lessonId: { in: lessons.map((l) => l.id) },
      },
    });
    return done >= lessons.length;
  }
}

/** Questões objetivas: acerto = conjunto selecionado idêntico ao gabarito. */
function gradeObjective(type: string, selected: Set<string>, correct: Set<string>): boolean {
  if (type === QuestionType.ESSAY || type === QuestionType.MATCHING || type === QuestionType.ORDERING) {
    return false; // correção manual fora do escopo desta fase
  }
  if (selected.size !== correct.size) return false;
  for (const id of selected) if (!correct.has(id)) return false;
  return correct.size > 0;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
