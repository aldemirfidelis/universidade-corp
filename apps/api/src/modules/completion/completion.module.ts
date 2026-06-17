import { Global, Module } from '@nestjs/common';
import { CompletionService } from './completion.service';

@Global()
@Module({
  providers: [CompletionService],
  exports: [CompletionService],
})
export class CompletionModule {}
