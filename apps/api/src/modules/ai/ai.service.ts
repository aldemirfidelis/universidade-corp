import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from './gemini.service';

export interface OutlineModule {
  title: string;
  lessons: string[];
}
export interface CourseOutline {
  description: string;
  objective: string;
  workloadHours: number;
  modules: OutlineModule[];
}
export interface GeneratedQuestion {
  statement: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

@Injectable()
export class AiService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  /** Tutor de dúvidas sobre o conteúdo de um treinamento (com fallback offline). */
  async tutor(companyId: string, courseId: string, question: string): Promise<{ answer: string; ai: boolean }> {
    const q = (question ?? '').trim();
    if (!q) throw new BadRequestException('Escreva sua dúvida.');
    if (q.length > 500) throw new BadRequestException('Pergunta muito longa (máx. 500 caracteres).');

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, companyId, deletedAt: null },
      select: {
        title: true,
        description: true,
        objective: true,
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          select: {
            title: true,
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: { title: true, contentText: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Treinamento não encontrado');

    if (!this.gemini.enabled) return { answer: tutorFallback(), ai: false };

    const prompt = `Você é um tutor do treinamento corporativo "${course.title}". Responda à dúvida do colaborador
de forma clara, objetiva e acolhedora, em português do Brasil, baseando-se SOMENTE no conteúdo abaixo.
Se a pergunta fugir do tema do treinamento, oriente gentilmente a focar no conteúdo do curso.

CONTEÚDO DO TREINAMENTO:
${buildTutorContext(course)}

PERGUNTA DO COLABORADOR: ${q}`;

    try {
      const text = await this.gemini.generateText(prompt);
      return { answer: text.trim(), ai: true };
    } catch {
      return { answer: tutorFallback(), ai: false };
    }
  }

  async courseOutline(topic: string, audience?: string): Promise<CourseOutline> {
    if (!this.gemini.enabled) return stubOutline(topic);
    const prompt = `Você é especialista em educação corporativa. Crie a estrutura de um treinamento
sobre "${topic}"${audience ? ` para o público: ${audience}` : ''}.
Formato JSON: { "description": string, "objective": string, "workloadHours": number,
"modules": [ { "title": string, "lessons": [string, ...] } ] }.
Use português do Brasil, 2 a 4 módulos, 2 a 4 aulas por módulo.`;
    try {
      return await this.gemini.generateJson<CourseOutline>(prompt);
    } catch {
      return stubOutline(topic);
    }
  }

  async questions(topic: string, count = 5): Promise<GeneratedQuestion[]> {
    if (!this.gemini.enabled) return stubQuestions(topic, count);
    const prompt = `Crie ${count} questões de múltipla escolha (4 alternativas, apenas 1 correta)
sobre "${topic}" para uma prova corporativa, em português do Brasil.
Formato JSON: [ { "statement": string, "options": [ { "text": string, "isCorrect": boolean } ] } ].`;
    try {
      const out = await this.gemini.generateJson<GeneratedQuestion[]>(prompt);
      return Array.isArray(out) ? out : stubQuestions(topic, count);
    } catch {
      return stubQuestions(topic, count);
    }
  }

  async certificateText(courseTitle: string): Promise<{ text: string }> {
    if (!this.gemini.enabled) {
      return {
        text: `Certificamos que {nome_funcionario} concluiu com aproveitamento o treinamento "${courseTitle}", com carga horária de {carga_horaria} horas.`,
      };
    }
    try {
      const text = await this.gemini.generateText(
        `Escreva um texto curto e formal (1 frase) para um certificado do treinamento "${courseTitle}", usando os campos dinâmicos {nome_funcionario}, {carga_horaria} e {data_conclusao}. Português do Brasil.`,
      );
      return { text: text.trim() };
    } catch {
      return { text: `Certificamos que {nome_funcionario} concluiu o treinamento "${courseTitle}".` };
    }
  }
}

// ---- Tutor: contexto + fallback ----
function buildTutorContext(course: {
  description: string | null;
  objective: string | null;
  modules: Array<{ title: string; lessons: Array<{ title: string; contentText: string | null }> }>;
}): string {
  const lines: string[] = [];
  if (course.description) lines.push(`Descrição: ${course.description}`);
  if (course.objective) lines.push(`Objetivo: ${course.objective}`);
  for (const m of course.modules) {
    lines.push(`\nMódulo: ${m.title}`);
    for (const l of m.lessons) {
      lines.push(`- ${l.title}${l.contentText ? `: ${l.contentText.slice(0, 300)}` : ''}`);
    }
  }
  return lines.join('\n').slice(0, 6000);
}

function tutorFallback(): string {
  return 'O tutor automático está indisponível no momento. Revise os materiais desta aula e, se a dúvida continuar, use a seção de comentários para perguntar ao instrutor.';
}

// ---- Stubs offline (quando não há GEMINI_API_KEY) ----
function stubOutline(topic: string): CourseOutline {
  return {
    description: `Treinamento introdutório sobre ${topic}, com foco prático para o dia a dia da equipe.`,
    objective: `Capacitar os colaboradores nos conceitos essenciais de ${topic}.`,
    workloadHours: 4,
    modules: [
      { title: `Fundamentos de ${topic}`, lessons: ['Conceitos iniciais', 'Boas práticas', 'Erros comuns'] },
      { title: `${topic} na prática`, lessons: ['Estudo de caso', 'Aplicação no trabalho'] },
    ],
  };
}

function stubQuestions(topic: string, count: number): GeneratedQuestion[] {
  return Array.from({ length: count }).map((_, i) => ({
    statement: `(${i + 1}) Sobre ${topic}, qual afirmação está correta?`,
    options: [
      { text: 'Afirmação correta de exemplo', isCorrect: true },
      { text: 'Alternativa incorreta A', isCorrect: false },
      { text: 'Alternativa incorreta B', isCorrect: false },
      { text: 'Alternativa incorreta C', isCorrect: false },
    ],
  }));
}
