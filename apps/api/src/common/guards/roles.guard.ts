import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@uc/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../modules/auth/public.decorator';
import { AuthPayload } from '../../modules/auth/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<{ user?: AuthPayload }>();
    const role = req.user?.role;
    if (!role) return false;

    // SUPER_ADMIN tem acesso a tudo.
    if (role === UserRole.SUPER_ADMIN) return true;
    if (!required || required.length === 0) return true;
    return required.includes(role);
  }
}
