import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { LearningPathsService } from './learning-paths.service';

/** Trilhas visíveis ao colaborador (publicadas, com progresso). */
@Controller('learning')
export class LearnerPathsController {
  constructor(private readonly service: LearningPathsService) {}

  @Get('paths')
  paths(@CurrentUser() user: AuthPayload) {
    return this.service.forLearner(effectiveCompanyId(user), user.sub);
  }
}
