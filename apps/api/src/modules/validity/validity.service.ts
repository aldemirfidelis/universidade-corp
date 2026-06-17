import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ValidityStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'NONE';

export const EXPIRING_DAYS = 30;

export interface CourseValidity {
  status: ValidityStatus;
  validUntil: Date | null;
  certificateId: string | null;
}

/** Controle de validade dos treinamentos (Goiasa: NRs, BPF etc. vencem). */
@Injectable()
export class ValidityService {
  constructor(private readonly prisma: PrismaService) {}

  static classify(validUntil: Date | null): ValidityStatus {
    if (!validUntil) return 'VALID'; // sem expiração configurada
    const now = Date.now();
    const limit = now + EXPIRING_DAYS * 24 * 3600_000;
    if (validUntil.getTime() < now) return 'EXPIRED';
    if (validUntil.getTime() < limit) return 'EXPIRING';
    return 'VALID';
  }

  /** Mapa courseId -> validade, a partir do último certificado do colaborador. */
  async forUser(companyId: string, userId: string): Promise<Map<string, CourseValidity>> {
    const certs = await this.prisma.certificate.findMany({
      where: { companyId, userId },
      orderBy: { issuedAt: 'desc' },
    });
    const map = new Map<string, CourseValidity>();
    for (const c of certs) {
      if (map.has(c.courseId)) continue; // mantém o mais recente
      map.set(c.courseId, {
        status: ValidityService.classify(c.validUntil),
        validUntil: c.validUntil,
        certificateId: c.id,
      });
    }
    return map;
  }

  /** Resumo de validade da empresa (para dashboards do RH). */
  async companySummary(companyId: string) {
    const certs = await this.prisma.certificate.findMany({
      where: { companyId },
      orderBy: { issuedAt: 'desc' },
      select: { userId: true, courseId: true, validUntil: true },
    });
    // último por (user, course)
    const seen = new Set<string>();
    let valid = 0;
    let expiring = 0;
    let expired = 0;
    for (const c of certs) {
      const key = `${c.userId}:${c.courseId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = ValidityService.classify(c.validUntil);
      if (s === 'EXPIRED') expired += 1;
      else if (s === 'EXPIRING') expiring += 1;
      else valid += 1;
    }
    return { valid, expiring, expired };
  }
}
