import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompanyOnboardingInput,
  CompanyStatus,
  UserAccessStatus,
  UserRole,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { randomToken } from '../../common/crypto';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null },
      include: { plan: true, settings: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      companies.map(async (c) => {
        const [users, courses, certificates] = await Promise.all([
          this.prisma.user.count({ where: { companyId: c.id, deletedAt: null } }),
          this.prisma.course.count({ where: { companyId: c.id, deletedAt: null } }),
          this.prisma.certificate.count({ where: { companyId: c.id } }),
        ]);
        return {
          id: c.id,
          legalName: c.legalName,
          tradeName: c.tradeName,
          cnpj: c.cnpj,
          status: c.status,
          plan: c.plan ? { id: c.plan.id, name: c.plan.name } : null,
          limits: c.plan
            ? { maxUsers: c.plan.maxUsers, maxCourses: c.plan.maxCourses, maxStorageMb: c.plan.maxStorageMb }
            : null,
          usage: { users, courses, certificates, storageUsedMb: c.storageUsedMb },
          lastAccessAt: c.lastAccessAt,
          implantedAt: c.implantedAt,
        };
      }),
    );
  }

  /** Cria empresa + admin inicial (retorna o link de convite para 1º acesso). */
  async createCompany(dto: CompanyOnboardingInput & { adminName: string; adminEmail: string }) {
    const existing = dto.cnpj
      ? await this.prisma.company.findFirst({ where: { cnpj: dto.cnpj, deletedAt: null } })
      : null;
    if (existing) throw new BadRequestException('Já existe empresa com este CNPJ');

    const company = await this.prisma.company.create({
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        cnpj: dto.cnpj ?? null,
        email: dto.email,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        segment: dto.segment ?? null,
        employeeCount: dto.employeeCount ?? null,
        responsibleName: dto.responsibleName ?? null,
        planId: dto.planId ?? null,
        settings: {
          create: { universityName: `Universidade ${dto.tradeName}` },
        },
      },
    });

    const inviteToken = randomToken();
    const admin = await this.prisma.user.create({
      data: {
        companyId: company.id,
        name: dto.adminName,
        email: dto.adminEmail,
        role: UserRole.COMPANY_ADMIN,
        accessStatus: UserAccessStatus.PENDING,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });

    return {
      company,
      admin: { id: admin.id, email: admin.email },
      inviteToken,
    };
  }

  async setStatus(companyId: string, status: CompanyStatus) {
    await this.ensureCompany(companyId);
    return this.prisma.company.update({ where: { id: companyId }, data: { status } });
  }

  async setPlan(companyId: string, planId: string) {
    await this.ensureCompany(companyId);
    return this.prisma.company.update({ where: { id: companyId }, data: { planId } });
  }

  async metrics() {
    const [companies, users, courses, certificates, activeCompanies] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.certificate.count(),
      this.prisma.company.count({ where: { status: CompanyStatus.ACTIVE, deletedAt: null } }),
    ]);
    return { companies, activeCompanies, users, courses, certificates };
  }

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { priceCents: 'asc' } });
  }

  async auditLogs(companyId?: string) {
    return this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async ensureCompany(companyId: string) {
    const c = await this.prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!c) throw new NotFoundException('Empresa não encontrada');
    return c;
  }
}
