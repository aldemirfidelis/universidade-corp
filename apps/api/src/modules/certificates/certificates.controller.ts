import {
  Controller,
  Get,
  Param,
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
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly service: CertificatesService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  list(@CurrentUser() user: AuthPayload) {
    return this.service.list(effectiveCompanyId(user));
  }

  /** Validação pública (a página /validar/:code consome este endpoint). */
  @Public()
  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.service.validate(code);
  }

  /**
   * PDF do certificado. O <a href> não envia header, então o token vai por query.
   */
  @Public()
  @Get(':id/pdf')
  pdf(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    const payload = this.verify(token);
    const isAdmin =
      payload.role === UserRole.COMPANY_ADMIN ||
      payload.role === UserRole.SUPER_ADMIN ||
      payload.role === UserRole.MANAGER;
    return this.service.streamPdf(effectiveCompanyId(payload), id, payload.sub, isAdmin, res);
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
