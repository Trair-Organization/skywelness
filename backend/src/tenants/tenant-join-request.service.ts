import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';
import { PushService } from '../notifications/push.service';

/**
 * Private partner kulübe üyelik başvurusu.
 * Requirement 7: idempotent; mevcut aktif/reddedilmiş üyeliklerde uygun hata döner.
 */
@Injectable()
export class TenantJoinRequestService {
  private readonly logger = new Logger(TenantJoinRequestService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly pushService: PushService,
  ) {}

  async createJoinRequest(
    user: User,
    subdomain: string,
    _message?: string,
  ): Promise<{
    id: string;
    status: 'pending_approval';
    tenantSubdomain: string;
    existing?: boolean;
  }> {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // R7.2: public kulübe join request atılamaz
    if (tenant.visibilityMode === 'public') {
      throw new BadRequestException({
        code: 'club_is_public',
        message: 'Bu kulüp public — direkt rezervasyon yapabilirsiniz.',
      });
    }

    const email = user.email.toLowerCase();
    const existing = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, email },
    });

    // R7.4: idempotent — zaten pending varsa aynı satırı dön
    if (existing?.accountStatus === MemberAccountStatus.PENDING_APPROVAL) {
      return {
        id: existing.id,
        status: 'pending_approval',
        tenantSubdomain: tenant.subdomain,
        existing: true,
      };
    }

    // R7.5: aktif üye → 409
    if (existing?.accountStatus === MemberAccountStatus.ACTIVE) {
      throw new ConflictException({
        code: 'already_member',
        message: 'Zaten bu kulübün aktif üyesisiniz.',
      });
    }

    // R7.6: rejected → 403
    if (existing?.accountStatus === MemberAccountStatus.REJECTED) {
      throw new ForbiddenException({
        code: 'membership_rejected',
        message: 'Başvurunuz daha önce reddedildi.',
      });
    }

    // R7.3: yeni pending user row oluştur
    const publicId = await this.generateMemberPublicId();
    const username = await this.resolveUniqueUsername(tenant.id, user.username || email);

    const newUser = this.usersRepo.create({
      tenantId: tenant.id,
      email,
      username,
      publicId,
      // Home tenant password hash kopyalanır. Login yine home tenant üzerinden
      // gerçekleşir; pending tenant'taki bu satır yalnızca membership kaydı.
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      photoUrl: user.photoUrl,
      role: UserRole.MEMBER,
      accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      emergencyContact: null,
      notificationPreferences: user.notificationPreferences ?? null,
      lastLogin: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.usersRepo.save(newUser);

    // Club admin'lere push bildirim
    void this.notifyClubAdmins(tenant.id, user);

    this.logger.log(`Join request → tenant=${tenant.subdomain} user=${user.email}`);
    return {
      id: newUser.id,
      status: 'pending_approval',
      tenantSubdomain: tenant.subdomain,
    };
  }

  private async generateMemberPublicId(): Promise<string> {
    const last = await this.usersRepo.findOne({
      where: {},
      order: { publicId: 'DESC' },
      select: ['publicId'],
    });
    const lastNum = last?.publicId?.startsWith('MBR-')
      ? parseInt(last.publicId.split('-')[1] ?? '0', 10) || 0
      : 0;
    return `MBR-${String(lastNum + 1).padStart(4, '0')}`;
  }

  /**
   * Username uniqueness (tenant_id, username) üzerinde. Collision durumunda
   * sonuna `-2`, `-3` ekleyerek boş olanı bul.
   */
  private async resolveUniqueUsername(tenantId: string, base: string): Promise<string> {
    const normalized = base.trim().toLowerCase();
    if (!normalized) return `member-${Date.now()}`;

    const candidates = [
      normalized,
      ...Array.from({ length: 20 }, (_, i) => `${normalized}-${i + 2}`),
    ];
    const taken = await this.usersRepo.find({
      where: { tenantId, username: In(candidates) },
      select: ['username'],
    });
    const takenSet = new Set(taken.map((t) => t.username));
    const free = candidates.find((c) => !takenSet.has(c));
    return free ?? `${normalized}-${Date.now()}`;
  }

  private async notifyClubAdmins(tenantId: string, applicant: User): Promise<void> {
    try {
      const admins = await this.usersRepo.find({
        where: { tenantId, role: UserRole.ADMINISTRATOR },
        select: ['id'],
      });
      const memberName = `${applicant.firstName} ${applicant.lastName}`.trim();
      for (const admin of admins) {
        void this.pushService.sendToUser(
          admin.id,
          '👤 Yeni Üyelik Başvurusu',
          `${memberName} kulübünüze üyelik başvurusu yaptı.`,
          { type: 'club_join_request', email: applicant.email },
        );
      }
    } catch (e) {
      this.logger.error(`Notify club admins failed: ${String(e)}`);
    }
  }
}
