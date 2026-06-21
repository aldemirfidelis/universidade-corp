import { Module } from '@nestjs/common';
import { LearningPathsController } from './learning-paths.controller';
import { LearnerPathsController } from './learner-paths.controller';
import { LearningPathsService } from './learning-paths.service';

@Module({
  controllers: [LearningPathsController, LearnerPathsController],
  providers: [LearningPathsService],
})
export class LearningPathsModule {}
