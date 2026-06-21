import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiTutorController } from './ai-tutor.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [AiController, AiTutorController],
  providers: [AiService, GeminiService],
  exports: [AiService],
})
export class AiModule {}
