import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { AuthPayload } from '../auth/auth.types';
import { DiscussionsService } from './discussions.service';

@Controller('discussions')
export class DiscussionsController {
  constructor(private readonly service: DiscussionsService) {}

  @Get('lessons/:lessonId/comments')
  list(@CurrentUser() user: AuthPayload, @Param('lessonId') lessonId: string) {
    return this.service.list(effectiveCompanyId(user), lessonId);
  }

  @Post('lessons/:lessonId/comments')
  create(
    @CurrentUser() user: AuthPayload,
    @Param('lessonId') lessonId: string,
    @Body() body: { body: string; parentId?: string | null },
  ) {
    return this.service.create(effectiveCompanyId(user), user.sub, lessonId, body.body, body.parentId);
  }

  @Delete('comments/:id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.remove(effectiveCompanyId(user), user, id);
  }
}
