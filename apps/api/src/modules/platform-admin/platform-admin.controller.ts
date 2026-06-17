import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CompanyStatus, UserRole } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform-admin')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  @Get('companies')
  companies() {
    return this.service.listCompanies();
  }

  @Post('companies')
  createCompany(
    @Body()
    dto: Parameters<PlatformAdminService['createCompany']>[0],
  ) {
    return this.service.createCompany(dto);
  }

  @Patch('companies/:id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: CompanyStatus }) {
    return this.service.setStatus(id, body.status);
  }

  @Patch('companies/:id/plan')
  setPlan(@Param('id') id: string, @Body() body: { planId: string }) {
    return this.service.setPlan(id, body.planId);
  }

  @Get('metrics')
  metrics() {
    return this.service.metrics();
  }

  @Get('plans')
  plans() {
    return this.service.listPlans();
  }

  @Get('audit')
  audit(@Query('companyId') companyId?: string) {
    return this.service.auditLogs(companyId);
  }
}
