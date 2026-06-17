import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanySettingsInput } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompany(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      include: { settings: true, plan: true },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async updateSettings(companyId: string, dto: CompanySettingsInput) {
    return this.prisma.companySettings.upsert({
      where: { companyId },
      create: { companyId, ...dto },
      update: dto,
    });
  }

  // ---- Departamentos ----
  listDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  createDepartment(companyId: string, name: string, parentId?: string | null) {
    return this.prisma.department.create({ data: { companyId, name, parentId: parentId ?? null } });
  }

  async deleteDepartment(companyId: string, id: string) {
    await this.prisma.department.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // ---- Cargos ----
  listPositions(companyId: string) {
    return this.prisma.position.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  createPosition(companyId: string, name: string) {
    return this.prisma.position.create({ data: { companyId, name } });
  }

  async deletePosition(companyId: string, id: string) {
    await this.prisma.position.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
