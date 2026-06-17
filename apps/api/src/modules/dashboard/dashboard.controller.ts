import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthPayload) {
    return this.service.companyOverview(effectiveCompanyId(user));
  }

  @Get('team')
  team(@CurrentUser() user: AuthPayload) {
    return this.service.teamOverview(effectiveCompanyId(user), user.sub);
  }
}
