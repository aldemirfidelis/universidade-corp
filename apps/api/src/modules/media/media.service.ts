import { createReadStream, statSync } from 'node:fs';
import { relative } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { uploadRoot } from './storage';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Anexa (ou substitui) o vídeo de uma aula. */
  async attachVideo(
    companyId: string,
    lessonId: string,
    file: Express.Multer.File,
    durationSeconds: number,
    createdBy?: string,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, companyId, deletedAt: null },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');

    const storedPath = relative(uploadRoot(), file.path).replace(/\\/g, '/');

    const upload = await this.prisma.fileUpload.create({
      data: {
        companyId,
        kind: 'video',
        originalName: file.originalname,
        storedPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        createdBy: createdBy ?? null,
      },
    });

    const video = await this.prisma.lessonVideo.upsert({
      where: { lessonId },
      create: {
        companyId,
        lessonId,
        fileUploadId: upload.id,
        storedPath,
        durationSeconds: Math.round(durationSeconds || 0),
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
      update: {
        fileUploadId: upload.id,
        storedPath,
        durationSeconds: Math.round(durationSeconds || 0),
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
    });

    await this.bumpStorage(companyId, file.size);
    return video;
  }

  async attachMaterial(
    companyId: string,
    lessonId: string,
    file: Express.Multer.File,
    title: string,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, companyId, deletedAt: null },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    const storedPath = relative(uploadRoot(), file.path).replace(/\\/g, '/');
    await this.bumpStorage(companyId, file.size);
    return this.prisma.lessonMaterial.create({
      data: {
        companyId,
        lessonId,
        title: title || file.originalname,
        storedPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  /** Upload genérico de imagem (logo/capa/avatar). Retorna o caminho público. */
  async saveImage(companyId: string, file: Express.Multer.File, kind: string) {
    const storedPath = relative(uploadRoot(), file.path).replace(/\\/g, '/');
    await this.prisma.fileUpload.create({
      data: {
        companyId,
        kind,
        originalName: file.originalname,
        storedPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
    await this.bumpStorage(companyId, file.size);
    return { url: `/api/media/file/${storedPath}` };
  }

  /** Streaming de vídeo com suporte a Range (necessário para seek no player). */
  async streamVideo(companyId: string, lessonId: string, req: Request, res: Response) {
    const video = await this.prisma.lessonVideo.findFirst({ where: { lessonId, companyId } });
    if (!video) throw new NotFoundException('Vídeo não encontrado');
    const fullPath = `${uploadRoot()}/${video.storedPath}`;

    let size: number;
    try {
      size = statSync(fullPath).size;
    } catch {
      throw new NotFoundException('Arquivo de vídeo ausente');
    }

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, { 'Content-Length': size, 'Content-Type': video.mimeType });
      createReadStream(fullPath).pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) throw new BadRequestException('Range inválido');
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': video.mimeType,
    });
    createReadStream(fullPath, { start, end }).pipe(res);
  }

  private async bumpStorage(companyId: string, bytes: number) {
    const mb = Math.ceil(bytes / (1024 * 1024));
    await this.prisma.company
      .update({ where: { id: companyId }, data: { storageUsedMb: { increment: mb } } })
      .catch(() => undefined);
  }
}
