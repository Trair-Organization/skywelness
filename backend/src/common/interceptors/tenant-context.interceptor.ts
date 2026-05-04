import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import type { User } from '../../database/entities/user.entity';
import { TenantsService } from '../../tenants/tenants.service';

/**
 * Runs after JWT guards: attaches {@link Request.tenantContext} when a user is present
 * and optionally validates `X-Tenant-Subdomain` against the session tenant.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantsService: TenantsService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: User; tenantContext?: { tenantId: string } }>();

    if (req.user) {
      req.tenantContext = { tenantId: req.user.tenantId };

      const hostSubdomain = req.requestSubdomain;
      if (hostSubdomain) {
        const resolvedFromHost = await this.tenantsService.resolveIdBySubdomain(hostSubdomain);
        if (!resolvedFromHost) {
          throw new ForbiddenException('Unknown tenant');
        }
        if (resolvedFromHost !== req.user.tenantId) {
          throw new ForbiddenException('Tenant host does not match your session');
        }
      }

      const raw = req.headers['x-tenant-subdomain'];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const header = String(raw).trim();
        const resolved = await this.tenantsService.resolveIdBySubdomain(header);
        if (!resolved) {
          throw new ForbiddenException('Unknown tenant');
        }
        if (resolved !== req.user.tenantId) {
          throw new ForbiddenException('Tenant context does not match your session');
        }
      }
    }

    return next.handle();
  }
}
