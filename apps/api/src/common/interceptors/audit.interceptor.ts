import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import { AuthPayload } from '../../modules/auth/auth.types';
import { effectiveCompanyId } from '../effective-company';

/**
 * Registra (auditoria/rastreabilidade) toda ação de mutação (POST/PUT/PATCH/DELETE).
 * Atende ao item de Segurança da Informação: logs com data/hora e autor.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthPayload }>();
    const method = req.method.toUpperCase();
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(() => {
        if (!mutating) return;
        const user = req.user;
        // Não audita login/refresh (rotas públicas sem user) para evitar ruído/segredos.
        if (!user) return;
        void this.audit.log({
          companyId: effectiveCompanyId(user),
          userId: user.sub,
          action: method,
          entity: req.path,
          metadata: { params: req.params },
          ip: (req.headers['x-forwarded-for'] as string) ?? req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
        });
      }),
    );
  }
}
