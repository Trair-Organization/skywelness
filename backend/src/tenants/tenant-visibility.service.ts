import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, type TenantVisibilityMode } from '../database/entities/tenant.entity';
import {
  TenantVisibilityAudit,
  type VisibilityChangeSource,
} from '../database/entities/tenant-visibility-audit.entity';
import { UserRole } from '../database/enums';

/**
 * Tenant visibility (public/private) değişikliklerini yönetir.
 * Club_Admin ve Platform_Admin her ikisi de bu servisi çağırır.
 * Requirements 3, 9, 12.
 */
@Injectable()
export class TenantVisibilityService {
  private readonly logger = new Logger(TenantVisibilityService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(TenantVisibilityAudit)
    private readonly auditRepo: Repository<TenantVisibilityAudit>,
  ) {}

  private validateMode(value: unknown): asserts value is TenantVisibilityMode {
    if (value !== 'public' && value !== 'private') {
      throw new BadRequestException(`Invalid visibilityMode. Must be 'public' or 'private'.`);
    }
  }

  /**
   * Club admin: kendi tenant'ının visibility'sini güncelle.
   * Requires administrator role on the target tenant (enforced by caller guard).
   */
  async updateByClubAdmin(
    tenantId: string,
    actingUserId: string,
    actingUserRole: UserRole,
    newMode: TenantVisibilityMode,
  ): Promise<{ visibilityMode: TenantVisibilityMode; changed: boolean }> {
    if (actingUserRole !== UserRole.ADMINISTRATOR) {
      throw new ForbiddenException('Only administrators can toggle club visibility');
    }
    return this.applyChange(tenantId, actingUserId, newMode, 'club_admin');
  }

  /**
   * Platform admin: herhangi bir tenant'ın visibility'sini güncelle.
   */
  async updateByPlatformAdmin(
    tenantId: string,
    actingUserId: string,
    newMode: TenantVisibilityMode,
  ): Promise<{ visibilityMode: TenantVisibilityMode; changed: boolean }> {
    return this.applyChange(tenantId, actingUserId, newMode, 'platform_admin');
  }

  private async applyChange(
    tenantId: string,
    actingUserId: string,
    newMode: TenantVisibilityMode,
    source: VisibilityChangeSource,
  ) {
    this.validateMode(newMode);

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // R9.6: same value → idempotent, no audit entry
    if (tenant.visibilityMode === newMode) {
      return { visibilityMode: tenant.visibilityMode, changed: false };
    }

    const previous = tenant.visibilityMode;
    tenant.visibilityMode = newMode;
    await this.tenantsRepo.save(tenant);

    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId,
        changedByUserId: actingUserId,
        previousValue: previous,
        newValue: newMode,
        source,
      }),
    );

    this.logger.log(
      `Tenant ${tenantId} visibility ${previous} → ${newMode} by ${actingUserId} (${source})`,
    );
    return { visibilityMode: newMode, changed: true };
  }
}
