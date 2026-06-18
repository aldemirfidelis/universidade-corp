import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@uc/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthPayload } from '../auth/auth.types';
import { ApdataService } from './apdata.service';

const excelUpload = {
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new BadRequestException('Envie uma planilha Excel (.xlsx ou .xls)'), ok);
  },
};

@Controller('apdata')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN)
export class ApdataController {
  constructor(private readonly service: ApdataService) {}

  @Post('employees/import')
  @UseInterceptors(FileInterceptor('file', excelUpload))
  importEmployees(@CurrentUser() user: AuthPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie a planilha Superior Imediato');
    return this.service.importEmployees(effectiveCompanyId(user), file, user.sub);
  }

  @Post('training-status/import')
  @UseInterceptors(FileInterceptor('file', excelUpload))
  importTrainingStatus(@CurrentUser() user: AuthPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie a planilha de validade/status dos treinamentos');
    return this.service.importTrainingStatus(effectiveCompanyId(user), file, user.sub);
  }

  @Get('pending')
  pending(@CurrentUser() user: AuthPayload) {
    return this.service.pendingOverview(effectiveCompanyId(user));
  }

  @Post('pending/dispatch')
  dispatch(
    @CurrentUser() user: AuthPayload,
    @Body()
    body: {
      area?: string;
      immediateSupervisor?: string;
      managerName?: string;
      requirementIds?: string[];
    },
  ) {
    return this.service.dispatchPending(effectiveCompanyId(user), body ?? {});
  }

  @Get('imports')
  imports(@CurrentUser() user: AuthPayload) {
    return this.service.listBatches(effectiveCompanyId(user));
  }
}
