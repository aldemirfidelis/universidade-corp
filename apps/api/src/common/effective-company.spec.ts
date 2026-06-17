import { describe, expect, it } from 'vitest';
import { effectiveCompanyId } from './effective-company';

describe('effectiveCompanyId', () => {
  it('SUPER_ADMIN pode impersonar via activeCompanyId', () => {
    expect(
      effectiveCompanyId({ role: 'SUPER_ADMIN', companyId: 'c1', activeCompanyId: 'c2' }),
    ).toBe('c2');
  });

  it('SUPER_ADMIN sem activeCompanyId usa a empresa de origem', () => {
    expect(effectiveCompanyId({ role: 'SUPER_ADMIN', companyId: 'c1' })).toBe('c1');
  });

  it('outros papéis ignoram activeCompanyId (isolamento)', () => {
    expect(
      effectiveCompanyId({ role: 'COMPANY_ADMIN', companyId: 'c1', activeCompanyId: 'c2' }),
    ).toBe('c1');
    expect(
      effectiveCompanyId({ role: 'EMPLOYEE', companyId: 'c1', activeCompanyId: 'c2' }),
    ).toBe('c1');
  });
});
