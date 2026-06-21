import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirstAccessInput, LoginInput, UserAccessStatus } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../common/env';
import { hashPassword, randomToken, verifyPassword } from '../../common/crypto';
import { AuthPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Login por e-mail, CPF ou matrícula (campo único "identifier"). */
  async login(dto: LoginInput) {
    const id = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: { equals: id, mode: 'insensitive' } },
          { cpf: id.replace(/\D/g, '') },
          { cpf: id },
          { registration: id },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (user.accessStatus === UserAccessStatus.BLOCKED) {
      throw new UnauthorizedException('Usuário bloqueado. Procure o administrador.');
    }
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    // Atualiza o "último acesso" da empresa.
    await this.prisma.company
      .update({ where: { id: user.companyId }, data: { lastAccessAt: new Date() } })
      .catch(() => undefined);

    return this.issueTokens(user);
  }

  /** Define a senha no primeiro acesso (via token de convite). */
  async firstAccess(dto: FirstAccessInput) {
    const user = await this.prisma.user.findFirst({
      where: { inviteToken: dto.token, deletedAt: null },
    });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Convite inválido ou expirado');
    }
    const passwordHash = await hashPassword(dto.password);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        accessStatus: UserAccessStatus.ACTIVE,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });
    return this.issueTokens(updated);
  }

  /** Gera token de reset de senha (devolvido em dev para teste). */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (!user) return { token: null }; // não revela existência do e-mail
    const token = randomToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetExpiresAt: new Date(Date.now() + 3600_000) },
    });
    return { token };
  }

  async resetPassword(dto: FirstAccessInput) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: dto.token, deletedAt: null },
    });
    if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetExpiresAt: null },
    });
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    let payload: AuthPayload;
    try {
      payload = await this.jwt.verifyAsync<AuthPayload>(refreshToken, {
        secret: env.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Usuário inválido');
    const ok = await verifyPassword(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Sessão expirada');
    return this.issueTokens(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true, position: true },
    });
    if (!user) throw new UnauthorizedException();
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: user.companyId },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      department: user.department?.name ?? null,
      position: user.position?.name ?? null,
      avatarUrl: user.avatarUrl,
      branding: settings
        ? {
            universityName: settings.universityName,
            logoUrl: settings.logoUrl,
            coverUrl: settings.coverUrl,
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
            heroTitle: settings.heroTitle,
            aboutText: settings.aboutText,
            mission: settings.missionText,
            vision: settings.visionText,
            guidelines: settings.guidelines,
          }
        : null,
    };
  }

  private async issueTokens(user: {
    id: string;
    companyId: string;
    role: string;
    name: string;
    email: string;
  }) {
    const payload: AuthPayload = {
      sub: user.id,
      companyId: user.companyId,
      role: user.role as AuthPayload['role'],
      name: user.name,
      email: user.email,
      activeCompanyId: null,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.jwt.accessSecret,
      expiresIn: env.jwt.accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshTtl,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hashPassword(refreshToken) },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}
