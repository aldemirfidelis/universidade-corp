import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../common/env';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger('Gemini');
  private client: GoogleGenerativeAI | null = null;

  get enabled() {
    return !!env.geminiApiKey;
  }

  private model() {
    if (!this.client) this.client = new GoogleGenerativeAI(env.geminiApiKey);
    return this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /** Gera texto livre. */
  async generateText(prompt: string): Promise<string> {
    const result = await this.model().generateContent(prompt);
    return result.response.text();
  }

  /** Gera e faz parse de JSON, tolerando blocos ```json. */
  async generateJson<T>(prompt: string): Promise<T> {
    const text = await this.generateText(
      `${prompt}\n\nResponda APENAS com JSON válido, sem comentários nem markdown.`,
    );
    return extractJson<T>(text);
  }
}

function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
