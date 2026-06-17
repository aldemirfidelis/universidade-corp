import { createReadStream, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { UserRole } from '@uc/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveCompanyId } from '../../common/effective-company';
import { env } from '../../common/env';
import { Public } from '../auth/public.decorator';
import { AuthPayload } from '../auth/auth.types';
import { MediaService } from './media.service';
import {
  ALLOWED_IMAGE,
  ALLOWED_MATERIAL,
  ALLOWED_VIDEO,
  maxUploadBytes,
  multerStorage,
  uploadRoot,
} from './storage';

@Controller('media')
export class MediaController {
  constructor(
    private readonly service: MediaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('lessons/:lessonId/video')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage('video'),
      limits: { fileSize: maxUploadBytes() },
      fileFilter: (_req, file, cb) =>
        cb(null, ALLOWED_VIDEO.includes(file.mimetype)),
    }),
  )
  uploadVideo(
    @CurrentUser() user: AuthPayload,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('duration') duration?: string,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo de vídeo (mp4/webm)');
    return this.service.attachVideo(
      effectiveCompanyId(user),
      lessonId,
      file,
      parseFloat(duration ?? '0'),
      user.sub,
    );
  }

  @Post('lessons/:lessonId/material')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage('material'),
      limits: { fileSize: maxUploadBytes() },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_MATERIAL.includes(file.mimetype)),
    }),
  )
  uploadMaterial(
    @CurrentUser() user: AuthPayload,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('title') title?: string,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo (PDF, imagem ou DOCX)');
    return this.service.attachMaterial(effectiveCompanyId(user), lessonId, file, title ?? '');
  }

  @Post('image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage('image'),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE.includes(file.mimetype)),
    }),
  )
  uploadImage(
    @CurrentUser() user: AuthPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
  ) {
    if (!file) throw new BadRequestException('Envie uma imagem');
    return this.service.saveImage(effectiveCompanyId(user), file, kind ?? 'image');
  }

  /**
   * Streaming de vídeo. O elemento <video> não envia header Authorization,
   * por isso o token vai por query (?token=) e é verificado aqui.
   */
  @Public()
  @Get('stream/:lessonId')
  async stream(
    @Param('lessonId') lessonId: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const payload = this.verify(token);
    return this.service.streamVideo(effectiveCompanyId(payload), lessonId, req, res);
  }

  /** Serve imagens públicas (logo/capa) por caminho relativo, com proteção contra path traversal. */
  @Public()
  @Get('file/*')
  serveFile(@Param() params: Record<string, string>, @Res() res: Response) {
    const rel = normalize(params['0'] ?? '').replace(/^(\.\.[/\\])+/, '');
    const full = join(uploadRoot(), rel);
    if (!full.startsWith(uploadRoot()) || !existsSync(full)) {
      res.status(404).end();
      return;
    }
    createReadStream(full).pipe(res);
  }

  private verify(token: string): AuthPayload {
    if (!token) throw new UnauthorizedException('Token ausente');
    try {
      return this.jwt.verify<AuthPayload>(token, { secret: env.jwt.accessSecret });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
