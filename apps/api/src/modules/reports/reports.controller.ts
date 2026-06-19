import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { UserRole } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { env } from '../../common/env';
import { Public } from '../auth/public.decorator';
import { AuthPayload } from '../auth/auth.types';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly jwt: JwtService,
  ) {}

  @Get('enrollments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  enrollments(@CurrentUser() user: AuthPayload, @Query() q: Record<string, string>) {
    return this.service.enrollments(effectiveCompanyId(user), q);
  }

  @Get('by-department')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.MANAGER)
  byDepartment(@CurrentUser() user: AuthPayload) {
    return this.service.byDepartment(effectiveCompanyId(user));
  }

  @Post('notify-manager')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  notifyManager(
    @CurrentUser() user: AuthPayload,
    @Body() body: { items: Array<{ userId: string; courseId: string }> },
  ) {
    return this.service.notifyManager(effectiveCompanyId(user), body.items || []);
  }

  // Exportações: <a href> com token na query.
  @Public()
  @Get('export/enrollments.xlsx')
  exportEnrollments(@Query() q: Record<string, string>, @Res() res: Response) {
    const payload = this.verify(q.token);
    return this.service.exportEnrollmentsXlsx(effectiveCompanyId(payload), q, res);
  }

  @Public()
  @Get('export/enrollments.pdf')
  exportEnrollmentsPdf(@Query() q: Record<string, string>, @Res() res: Response) {
    const payload = this.verify(q.token);
    return this.service.exportEnrollmentsPdf(effectiveCompanyId(payload), q, res);
  }

  @Public()
  @Get('export/certificates.xlsx')
  exportCertificates(@Query('token') token: string, @Res() res: Response) {
    const payload = this.verify(token);
    return this.service.exportCertificatesXlsx(effectiveCompanyId(payload), res);
  }

  private verify(token: string): AuthPayload {
    if (!token) throw new UnauthorizedException('Token ausente');
    try {
      return this.jwt.verify<AuthPayload>(token, { secret: env.jwt.accessSecret });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
