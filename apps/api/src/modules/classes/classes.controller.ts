import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createClassSchema, UserRole, type CreateClassInput } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { ClassesService } from './classes.service';

@Controller('classes')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR, UserRole.MANAGER)
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  list(@CurrentUser() user: AuthPayload) {
    return this.service.list(effectiveCompanyId(user));
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.getOne(effectiveCompanyId(user), id);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
  create(
    @CurrentUser() user: AuthPayload,
    @Body(new ZodValidationPipe(createClassSchema)) dto: CreateClassInput,
  ) {
    return this.service.create(effectiveCompanyId(user), dto, user.sub);
  }

  @Post(':id/students')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
  addStudents(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() body: { studentIds?: string[]; departmentId?: string; positionId?: string },
  ) {
    return this.service.addStudents(effectiveCompanyId(user), id, body);
  }
}
