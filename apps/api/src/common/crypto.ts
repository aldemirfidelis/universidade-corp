import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Token opaco para convites e reset de senha. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Código legível de certificado, ex.: UC-3F8A2B-7C1D. */
export function certificateCode(): string {
  const part = () => randomBytes(3).toString('hex').toUpperCase();
  return `UC-${part()}-${part()}`;
}
