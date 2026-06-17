import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { env } from './common/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expressApp = app.getHttpAdapter().getInstance() as any;

  app.setGlobalPrefix(env.apiPrefix);
  expressApp.set?.('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  // Importação em massa pode trazer payloads grandes (JSON).
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  const isWildcard = env.corsOrigin === '*';
  app.enableCors({
    origin: isWildcard ? true : env.corsOrigin.split(',').map((s) => s.trim()),
    credentials: !isWildcard,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(env.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[uc-api] listening on http://0.0.0.0:${env.port}/${env.apiPrefix}`);
}

bootstrap();
