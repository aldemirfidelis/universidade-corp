import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { AiService } from './ai.service';

/** Tutor IA acessível a qualquer usuário autenticado (inclusive colaboradores). */
@Controller('ai')
export class AiTutorController {
  constructor(private readonly service: AiService) {}

  @Post('tutor')
  tutor(@CurrentUser() user: AuthPayload, @Body() body: { courseId: string; question: string }) {
    return this.service.tutor(effectiveCompanyId(user), body.courseId, body.question);
  }
}
