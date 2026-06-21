import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  learningPathSchema,
  learningPathCoursesSchema,
  UserRole,
  type LearningPathInput,
  type LearningPathCoursesInput,
} from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { LearningPathsService } from './learning-paths.service';

@Controller('learning-paths')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
export class LearningPathsController {
  constructor(private readonly service: LearningPathsService) {}

  @Get()
  list(@CurrentUser() user: AuthPayload) {
    return this.service.list(effectiveCompanyId(user));
  }

  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.get(effectiveCompanyId(user), id);
  }

  @Post()
  create(@CurrentUser() user: AuthPayload, @Body(new ZodValidationPipe(learningPathSchema)) dto: LearningPathInput) {
    return this.service.create(effectiveCompanyId(user), dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(learningPathSchema)) dto: LearningPathInput,
  ) {
    return this.service.update(effectiveCompanyId(user), id, dto);
  }

  @Put(':id/courses')
  setCourses(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(learningPathCoursesSchema)) dto: LearningPathCoursesInput,
  ) {
    return this.service.setCourses(effectiveCompanyId(user), id, dto.courseIds);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.publish(effectiveCompanyId(user), id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.remove(effectiveCompanyId(user), id);
  }
}
