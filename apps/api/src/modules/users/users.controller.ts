import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createUserSchema,
  updateUserSchema,
  UserAccessStatus,
  UserRole,
  type CreateUserInput,
  type UpdateUserInput,
} from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthPayload,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: string,
  ) {
    return this.service.list(effectiveCompanyId(user), { search, departmentId, role });
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.getOne(effectiveCompanyId(user), id);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN)
  create(
    @CurrentUser() user: AuthPayload,
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserInput,
  ) {
    return this.service.create(effectiveCompanyId(user), dto, user.sub);
  }

  @Post('import')
  @Roles(UserRole.COMPANY_ADMIN)
  bulkImport(
    @CurrentUser() user: AuthPayload,
    @Body() body: { rows: Array<Record<string, string>> },
  ) {
    return this.service.bulkImport(effectiveCompanyId(user), body.rows ?? [], user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN)
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserInput,
  ) {
    return this.service.update(effectiveCompanyId(user), id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.COMPANY_ADMIN)
  setStatus(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() body: { status: UserAccessStatus },
  ) {
    return this.service.setStatus(effectiveCompanyId(user), id, body.status);
  }

  @Post(':id/resend-invite')
  @Roles(UserRole.COMPANY_ADMIN)
  resendInvite(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.resendInvite(effectiveCompanyId(user), id);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN)
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.remove(effectiveCompanyId(user), id);
  }
}
