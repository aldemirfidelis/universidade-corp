import { Module } from '@nestjs/common';
import { ApdataController } from './apdata.controller';
import { ApdataService } from './apdata.service';

@Module({
  controllers: [ApdataController],
  providers: [ApdataService],
})
export class ApdataModule {}
