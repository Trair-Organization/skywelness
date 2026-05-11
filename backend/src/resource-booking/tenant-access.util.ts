import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';
import { MemberAccountStatus } from '../database/enums';

export type TenantAccessOutcome =
  | { allow: true }
  | { allow: false; reason: 'private_club_membership_required' };

/**
 * Partner kulübe erişim kuralları (P2 Booking Authorization Invariant, P6 Confluence):
 * - Public kulüp → her Platform_User izinli (üyelik gerekmez)
 * - Private kulüp → sadece aynı email ile accountStatus = 'active' olan kullanıcı izinli
 *
 * Bu fonksiyon saf (pure) ve request sırasına bağlı değildir. Membership_Check
 * hedef tenant'ta kullanıcının email'ine karşılık gelen User satırı üzerinden
 * yapılır. Kullanıcının Home_Tenant'ından bağımsızdır.
 *
 * workspaceType !== 'partner_club' olan tenant'larda bu kontrol no-op'tur (R1.5).
 */
export async function checkTenantBookingAccess(
  user: User,
  tenant: Tenant,
  usersRepo: Repository<User>,
): Promise<TenantAccessOutcome> {
  const workspaceType = (tenant.settings as { workspaceType?: string } | null | undefined)
    ?.workspaceType;
  if (workspaceType !== 'partner_club') {
    return { allow: true };
  }

  if (tenant.visibilityMode === 'public') {
    return { allow: true };
  }

  // Private kulüp → Active_Membership zorunlu
  if (!user.email) {
    return { allow: false, reason: 'private_club_membership_required' };
  }
  const membership = await usersRepo.findOne({
    where: {
      tenantId: tenant.id,
      email: user.email.toLowerCase(),
    },
    select: ['id', 'accountStatus'],
  });

  if (membership?.accountStatus === MemberAccountStatus.ACTIVE) {
    return { allow: true };
  }
  return { allow: false, reason: 'private_club_membership_required' };
}

/**
 * Helper: `checkTenantBookingAccess` çağırır, allow=false ise 403 fırlatır.
 * Servis katmanında tek satırda kullanım için.
 */
export async function assertTenantBookingAccess(
  user: User,
  tenant: Tenant,
  usersRepo: Repository<User>,
): Promise<void> {
  const outcome = await checkTenantBookingAccess(user, tenant, usersRepo);
  if (!outcome.allow) {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: outcome.reason,
      message: 'Bu kulüp sadece onaylı üyelerine hizmet veriyor.',
    });
  }
}
