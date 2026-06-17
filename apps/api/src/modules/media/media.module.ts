import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../common/env';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [JwtModule.register({ secret: env.jwt.accessSecret })],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
