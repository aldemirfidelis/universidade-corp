import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { env } from '../../common/env';
import { AuthPayload } from '../auth/auth.types';
import { effectiveCompanyId } from '../../common/effective-company';

export function uploadRoot(): string {
  return resolve(process.cwd(), env.uploadDir);
}

export function companyDir(companyId: string, kind: string): string {
  const dir = join(uploadRoot(), companyId, kind);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Multer diskStorage que separa arquivos por empresa (companyId do JWT). */
export function multerStorage(kind: string) {
  return diskStorage({
    destination: (req: Request, _file, cb) => {
      const user = (req as Request & { user?: AuthPayload }).user;
      const companyId = user ? effectiveCompanyId(user) : 'anon';
      cb(null, companyDir(companyId, kind));
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
    },
  });
}

export const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_MATERIAL = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export function maxUploadBytes(): number {
  return env.maxUploadMb * 1024 * 1024;
}
