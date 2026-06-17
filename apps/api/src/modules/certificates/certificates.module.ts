import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../common/env';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [JwtModule.register({ secret: env.jwt.accessSecret })],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
