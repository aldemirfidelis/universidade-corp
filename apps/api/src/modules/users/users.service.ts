import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateUserInput,
  UpdateUserInput,
  UserAccessStatus,
  UserRole,
} from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { randomToken } from '../../common/crypto';
import { MailService } from '../mail/mail.service';
import { MatrixService } from '../matrix/matrix.service';

const INVITE_TTL_MS = 7 * 24 * 3600_000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly matrix: MatrixService,
  ) {}

  async list(companyId: string, query?: { search?: string; departmentId?: string; role?: string }) {
    return this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        departmentId: query?.departmentId || undefined,
        role: (query?.role as UserRole) || undefined,
        OR: query?.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { registration: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { department: true, position: true },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(companyId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { department: true, position: true, manager: true },
    });
    if (!user) throw new NotFoundException('Funcionário não encontrado');
    return user;
  }

  async create(companyId: string, dto: CreateUserInput, createdBy?: string) {
    const dup = await this.prisma.user.findFirst({
      where: { companyId, email: { equals: dto.email, mode: 'insensitive' }, deletedAt: null },
    });
    if (dup) throw new BadRequestException('Já existe funcionário com este e-mail');

    const inviteToken = randomToken();
    const user = await this.prisma.user.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        cpf: dto.cpf ?? null,
        phone: dto.phone ?? null,
        registration: dto.registration ?? null,
        role: dto.role ?? UserRole.EMPLOYEE,
        departmentId: dto.departmentId ?? null,
        positionId: dto.positionId ?? null,
        area: dto.area ?? null,
        unit: dto.unit ?? null,
        managerId: dto.managerId ?? null,
        admissionDate: dto.admissionDate ?? null,
        accessStatus: UserAccessStatus.PENDING,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        createdBy: createdBy ?? null,
      },
    });
    await this.sendInvite(user.email, user.name, inviteToken);
    // Matriz de treinamentos: disponibiliza automaticamente os cursos do cargo.
    await this.matrix.enrollUserMatrix(companyId, user.id, user.positionId);
    return { ...user, inviteToken };
  }

  async update(companyId: string, id: string, dto: UpdateUserInput) {
    const before = await this.getOne(companyId, id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        cpf: dto.cpf,
        phone: dto.phone,
        registration: dto.registration,
        role: dto.role,
        departmentId: dto.departmentId,
        positionId: dto.positionId,
        area: dto.area,
        unit: dto.unit,
        managerId: dto.managerId,
        admissionDate: dto.admissionDate,
      },
    });
    // Se o cargo mudou, re-aplica a matriz de treinamentos do novo cargo.
    if (dto.positionId && dto.positionId !== before.positionId) {
      await this.matrix.enrollUserMatrix(companyId, id, dto.positionId);
    }
    return user;
  }

  async setStatus(companyId: string, id: string, status: UserAccessStatus) {
    await this.getOne(companyId, id);
    return this.prisma.user.update({ where: { id }, data: { accessStatus: status } });
  }

  async remove(companyId: string, id: string) {
    await this.getOne(companyId, id);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async resendInvite(companyId: string, id: string) {
    const user = await this.getOne(companyId, id);
    const inviteToken = randomToken();
    await this.prisma.user.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    });
    await this.sendInvite(user.email, user.name, inviteToken);
    return { inviteToken };
  }

  /** Importação em massa. Cada linha: { name, email, cpf?, registration?, departmentName?, positionName? }. */
  async bulkImport(
    companyId: string,
    rows: Array<Record<string, string>>,
    createdBy?: string,
  ) {
    const result = { created: 0, skipped: 0, errors: [] as string[] };
    const departments = await this.prisma.department.findMany({ where: { companyId, deletedAt: null } });
    const positions = await this.prisma.position.findMany({ where: { companyId, deletedAt: null } });
    const depByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
    const posByName = new Map(positions.map((p) => [p.name.toLowerCase(), p.id]));

    for (const [i, raw] of rows.entries()) {
      const row = normalizeKeys(raw);
      const name = row.name ?? row.nome;
      const email = row.email ?? row['e-mail'];
      if (!name || !email) {
        result.skipped += 1;
        result.errors.push(`Linha ${i + 1}: nome e e-mail são obrigatórios`);
        continue;
      }
      const exists = await this.prisma.user.findFirst({
        where: { companyId, email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      });
      if (exists) {
        result.skipped += 1;
        continue;
      }
      const depName = (row.departamento ?? row.setor ?? row.department ?? '').toLowerCase();
      const posName = (row.cargo ?? row.position ?? '').toLowerCase();
      const inviteToken = randomToken();
      const positionId = posByName.get(posName) ?? null;
      const created = await this.prisma.user.create({
        data: {
          companyId,
          name,
          email,
          cpf: row.cpf ?? null,
          registration: row.matricula ?? row['matrícula'] ?? row.registration ?? null,
          phone: row.telefone ?? row.phone ?? null,
          area: row['área'] ?? row.area ?? null,
          unit: row.unidade ?? row.unit ?? null,
          role: UserRole.EMPLOYEE,
          departmentId: depByName.get(depName) ?? null,
          positionId,
          accessStatus: UserAccessStatus.PENDING,
          inviteToken,
          inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
          createdBy: createdBy ?? null,
        },
      });
      // Matriz de treinamentos por cargo.
      await this.matrix.enrollUserMatrix(companyId, created.id, positionId);
      result.created += 1;
    }
    return result;
  }

  private async sendInvite(email: string, name: string, token: string) {
    const link = `${frontendUrl()}/primeiro-acesso?token=${token}`;
    await this.mail.send(
      email,
      'Bem-vindo à Universidade Corporativa',
      `<p>Olá, ${name}!</p><p>Crie sua senha de acesso:</p><p><a href="${link}">${link}</a></p>`,
    );
  }
}

function normalizeKeys(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase()] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

function frontendUrl(): string {
  return (process.env.API_CORS_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim();
}
