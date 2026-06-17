import { Global, Module } from '@nestjs/common';
import { ValidityService } from './validity.service';

@Global()
@Module({
  providers: [ValidityService],
  exports: [ValidityService],
})
export class ValidityModule {}
