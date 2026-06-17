import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createCourseSchema,
  createLessonSchema,
  createModuleSchema,
  updateCourseSchema,
  CourseStatus,
  UserRole,
  type CreateCourseInput,
  type CreateLessonInput,
  type CreateModuleInput,
  type UpdateCourseInput,
} from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('status') status?: CourseStatus) {
    return this.service.list(effectiveCompanyId(user), status);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.getFull(effectiveCompanyId(user), id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthPayload,
    @Body(new ZodValidationPipe(createCourseSchema)) dto: CreateCourseInput,
  ) {
    return this.service.create(effectiveCompanyId(user), dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) dto: UpdateCourseInput,
  ) {
    return this.service.update(effectiveCompanyId(user), id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.publish(effectiveCompanyId(user), id);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.archive(effectiveCompanyId(user), id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.remove(effectiveCompanyId(user), id);
  }

  // ---- Módulos ----
  @Post(':id/modules')
  createModule(
    @CurrentUser() user: AuthPayload,
    @Param('id') courseId: string,
    @Body(new ZodValidationPipe(createModuleSchema)) dto: CreateModuleInput,
  ) {
    return this.service.createModule(effectiveCompanyId(user), courseId, dto);
  }

  @Delete('modules/:moduleId')
  deleteModule(@CurrentUser() user: AuthPayload, @Param('moduleId') moduleId: string) {
    return this.service.deleteModule(effectiveCompanyId(user), moduleId);
  }

  // ---- Aulas ----
  @Post('modules/:moduleId/lessons')
  createLesson(
    @CurrentUser() user: AuthPayload,
    @Param('moduleId') moduleId: string,
    @Body(new ZodValidationPipe(createLessonSchema)) dto: CreateLessonInput,
  ) {
    return this.service.createLesson(effectiveCompanyId(user), moduleId, dto);
  }

  @Delete('lessons/:lessonId')
  deleteLesson(@CurrentUser() user: AuthPayload, @Param('lessonId') lessonId: string) {
    return this.service.deleteLesson(effectiveCompanyId(user), lessonId);
  }
}
