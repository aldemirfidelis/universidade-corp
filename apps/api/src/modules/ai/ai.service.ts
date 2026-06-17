import { Injectable } from '@nestjs/common';
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
  constructor(private readonly gemini: GeminiService) {}

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
