import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { trainingMatrixSchema, UserRole, type TrainingMatrixInput } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { MatrixService } from './matrix.service';

@Controller('matrix')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
export class MatrixController {
  constructor(private readonly service: MatrixService) {}

  @Get()
  overview(@CurrentUser() user: AuthPayload) {
    return this.service.overview(effectiveCompanyId(user));
  }

  @Get('position/:positionId')
  byPosition(@CurrentUser() user: AuthPayload, @Param('positionId') positionId: string) {
    return this.service.getByPosition(effectiveCompanyId(user), positionId);
  }

  @Put('position/:positionId')
  set(
    @CurrentUser() user: AuthPayload,
    @Param('positionId') positionId: string,
    @Body(new ZodValidationPipe(trainingMatrixSchema)) dto: TrainingMatrixInput,
  ) {
    return this.service.setMatrix(effectiveCompanyId(user), positionId, dto.courseIds);
  }
}
