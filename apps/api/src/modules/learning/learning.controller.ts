import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { lessonProgressSchema, type LessonProgressInput } from '@uc/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { LearningService } from './learning.service';

@Controller('learning')
export class LearningController {
  constructor(private readonly service: LearningService) {}

  @Get('my-courses')
  myCourses(@CurrentUser() user: AuthPayload) {
    return this.service.myCourses(effectiveCompanyId(user), user.sub);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload) {
    return this.service.dashboard(effectiveCompanyId(user), user.sub);
  }

  @Post('courses/:id/restart')
  restart(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.restartCourse(effectiveCompanyId(user), user.sub, id);
  }

  @Get('courses/:id')
  course(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.courseForStudent(effectiveCompanyId(user), user.sub, id);
  }

  @Post('lessons/:lessonId/progress')
  progress(
    @CurrentUser() user: AuthPayload,
    @Param('lessonId') lessonId: string,
    @Body(new ZodValidationPipe(lessonProgressSchema)) dto: LessonProgressInput,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip;
    const device = req.headers['user-agent'];
    return this.service.recordProgress(
      effectiveCompanyId(user),
      user.sub,
      lessonId,
      dto,
      ip,
      device,
    );
  }

  @Get('certificates')
  certificates(@CurrentUser() user: AuthPayload) {
    return this.service.myCertificates(effectiveCompanyId(user), user.sub);
  }
}
