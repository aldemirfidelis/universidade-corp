import { Global, Module } from '@nestjs/common';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';

@Global()
@Module({
  controllers: [MatrixController],
  providers: [MatrixService],
  exports: [MatrixService],
})
export class MatrixModule {}
