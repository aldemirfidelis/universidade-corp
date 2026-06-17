import { UserRole } from '@uc/shared';

/**
 * Empresa "efetiva" da sessão (fonte da verdade do multi-tenant).
 *
 * Apenas o SUPER_ADMIN pode "entrar" em outra empresa (impersonação) via
 * `activeCompanyId`. Para qualquer outro papel, `activeCompanyId` é IGNORADO e a
 * empresa é sempre a de origem do usuário.
 *
 * NUNCA derive a empresa de um valor enviado pelo frontend — sempre desta função,
 * a partir do registro do usuário no banco / payload do JWT.
 */
export function effectiveCompanyId(u: {
  role: string;
  companyId: string;
  activeCompanyId?: string | null;
}): string {
  if (u.role === UserRole.SUPER_ADMIN && u.activeCompanyId) return u.activeCompanyId;
  return u.companyId;
}
