import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { submitExamSchema, type SubmitExamInput } from '@uc/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { AssessmentsService } from './assessments.service';

/** Endpoints do aluno para realizar a prova. */
@Controller('exam')
export class ExamController {
  constructor(private readonly service: AssessmentsService) {}

  @Get('course/:courseId/state')
  state(@CurrentUser() user: AuthPayload, @Param('courseId') courseId: string) {
    return this.service.examState(effectiveCompanyId(user), user.sub, courseId);
  }

  @Post('course/:courseId/start')
  start(@CurrentUser() user: AuthPayload, @Param('courseId') courseId: string) {
    return this.service.startAttempt(effectiveCompanyId(user), user.sub, courseId);
  }

  @Post('attempts/:attemptId/submit')
  submit(
    @CurrentUser() user: AuthPayload,
    @Param('attemptId') attemptId: string,
    @Body(new ZodValidationPipe(submitExamSchema)) dto: SubmitExamInput,
  ) {
    return this.service.submitAttempt(effectiveCompanyId(user), user.sub, attemptId, dto);
  }
}
