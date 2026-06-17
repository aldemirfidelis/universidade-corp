import { UserRole } from '@uc/shared';

/** Payload do JWT / objeto anexado em req.user. */
export interface AuthPayload {
  sub: string; // userId
  companyId: string;
  role: UserRole;
  name: string;
  email: string;
  /** Apenas SUPER_ADMIN: empresa "ativa" (impersonação). */
  activeCompanyId?: string | null;
}
