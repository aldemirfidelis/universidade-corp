import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

  @Get('me')
  me(@CurrentUser() user: AuthPayload) {
    return this.service.getProfile(effectiveCompanyId(user), user.sub);
  }

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: AuthPayload, @Query('scope') scope?: string) {
    const s = scope === 'team' ? 'team' : 'company';
    return this.service.getLeaderboard(effectiveCompanyId(user), user.sub, s);
  }
}
