import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { ExamController } from './exam.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  controllers: [AssessmentsController, ExamController],
  providers: [AssessmentsService],
})
export class AssessmentsModule {}
