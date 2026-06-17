import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthPayload) {
    return this.prisma.notification.findMany({
      where: { companyId: effectiveCompanyId(user), userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.sub, companyId: effectiveCompanyId(user) },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
