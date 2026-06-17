import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../common/env';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [JwtModule.register({ secret: env.jwt.accessSecret })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
