import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  assessmentConfigSchema,
  createQuestionSchema,
  UserRole,
  type AssessmentConfigInput,
  type CreateQuestionInput,
} from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  @Get('course/:courseId')
  byCourse(@CurrentUser() user: AuthPayload, @Param('courseId') courseId: string) {
    return this.service.getByCourse(effectiveCompanyId(user), courseId);
  }

  @Put('course/:courseId')
  upsert(
    @CurrentUser() user: AuthPayload,
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(assessmentConfigSchema)) dto: AssessmentConfigInput,
  ) {
    return this.service.upsertConfig(effectiveCompanyId(user), courseId, dto);
  }

  @Post(':assessmentId/questions')
  addQuestion(
    @CurrentUser() user: AuthPayload,
    @Param('assessmentId') assessmentId: string,
    @Body(new ZodValidationPipe(createQuestionSchema)) dto: CreateQuestionInput,
  ) {
    return this.service.addQuestion(effectiveCompanyId(user), assessmentId, dto);
  }

  @Delete('questions/:questionId')
  deleteQuestion(@CurrentUser() user: AuthPayload, @Param('questionId') questionId: string) {
    return this.service.deleteQuestion(effectiveCompanyId(user), questionId);
  }
}
