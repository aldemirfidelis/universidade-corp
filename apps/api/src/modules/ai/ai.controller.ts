import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('course-outline')
  outline(@Body() body: { topic: string; audience?: string }) {
    return this.service.courseOutline(body.topic, body.audience);
  }

  @Post('questions')
  questions(@Body() body: { topic: string; count?: number }) {
    return this.service.questions(body.topic, body.count ?? 5);
  }

  @Post('certificate-text')
  certificateText(@Body() body: { courseTitle: string }) {
    return this.service.certificateText(body.courseTitle);
  }
}
