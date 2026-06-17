import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { companySettingsSchema, UserRole, type CompanySettingsInput } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get('me')
  me(@CurrentUser() user: AuthPayload) {
    return this.service.getCompany(effectiveCompanyId(user));
  }

  @Patch('settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  updateSettings(
    @CurrentUser() user: AuthPayload,
    @Body(new ZodValidationPipe(companySettingsSchema)) dto: CompanySettingsInput,
  ) {
    return this.service.updateSettings(effectiveCompanyId(user), dto);
  }

  @Get('departments')
  departments(@CurrentUser() user: AuthPayload) {
    return this.service.listDepartments(effectiveCompanyId(user));
  }

  @Post('departments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  createDepartment(
    @CurrentUser() user: AuthPayload,
    @Body() body: { name: string; parentId?: string },
  ) {
    return this.service.createDepartment(effectiveCompanyId(user), body.name, body.parentId);
  }

  @Delete('departments/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  deleteDepartment(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.deleteDepartment(effectiveCompanyId(user), id);
  }

  @Get('positions')
  positions(@CurrentUser() user: AuthPayload) {
    return this.service.listPositions(effectiveCompanyId(user));
  }

  @Post('positions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  createPosition(@CurrentUser() user: AuthPayload, @Body() body: { name: string }) {
    return this.service.createPosition(effectiveCompanyId(user), body.name);
  }

  @Delete('positions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  deletePosition(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.deletePosition(effectiveCompanyId(user), id);
  }
}
