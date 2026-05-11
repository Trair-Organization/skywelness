import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionRequest } from '../database/entities/connection-request.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';
import { PushService } from '../notifications/push.service';

@Injectable()
export class ConnectionsService {
  constructor(
    @InjectRepository(ConnectionRequest) private readonly reqRepo: Repository<ConnectionRequest>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TrainerMemberLink) private readonly linksRepo: Repository<TrainerMemberLink>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly pushService: PushService,
  ) {}

  /** Public ID ile kullanıcı veya kulüp bul */
  async findByPublicId(publicId: string) {
    const code = publicId.trim().toUpperCase();
    if (code.startsWith('CLB-')) {
      const tenant = await this.tenantsRepo.findOne({ where: { publicId: code } });
      if (!tenant) throw new NotFoundException('Kulüp bulunamadı');
      return { type: 'tenant' as const, id: tenant.id, name: tenant.name, publicId: code };
    }
    const user = await this.usersRepo.findOne({ where: { publicId: code } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return {
      type: 'user' as const,
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      publicId: code,
    };
  }

  /** Bağlantı isteği gönder */
  async sendRequest(sender: User, receiverPublicId: string, message?: string) {
    const receiver = await this.findByPublicId(receiverPublicId);

    // Determine connection type
    const senderRole = sender.role;
    let connectionType: string;
    let senderUserId: string | null = sender.id;
    let senderTenantId: string | null = null;
    let receiverUserId: string | null = null;
    let receiverTenantId: string | null = null;

    if (receiver.type === 'tenant') {
      receiverTenantId = receiver.id;
      if (senderRole === UserRole.TRAINER || senderRole === UserRole.INDEPENDENT_TRAINER) {
        connectionType = 'trainer_to_club';
      } else {
        connectionType = 'member_to_club';
      }
    } else {
      receiverUserId = receiver.id;
      if (receiver.role === UserRole.TRAINER || receiver.role === UserRole.INDEPENDENT_TRAINER) {
        if (senderRole === UserRole.MEMBER) {
          connectionType = 'member_to_trainer';
        } else if (senderRole === UserRole.ADMINISTRATOR) {
          connectionType = 'club_to_trainer';
          senderUserId = null;
          senderTenantId = sender.tenantId;
        } else {
          connectionType = 'trainer_to_member'; // trainer adding another trainer as student? unlikely but handle
        }
      } else {
        // Receiver is a member
        if (senderRole === UserRole.TRAINER || senderRole === UserRole.INDEPENDENT_TRAINER) {
          connectionType = 'trainer_to_member';
        } else if (senderRole === UserRole.ADMINISTRATOR) {
          connectionType = 'club_to_member';
          senderUserId = null;
          senderTenantId = sender.tenantId;
        } else {
          throw new BadRequestException('Bu bağlantı tipi desteklenmiyor');
        }
      }
    }

    // Check duplicate
    const existing = await this.reqRepo.findOne({
      where: {
        senderUserId: senderUserId ?? undefined,
        senderTenantId: senderTenantId ?? undefined,
        receiverUserId: receiverUserId ?? undefined,
        receiverTenantId: receiverTenantId ?? undefined,
        status: 'pending',
      },
    });
    if (existing) throw new ConflictException('Zaten bekleyen bir isteğiniz var');

    const req = this.reqRepo.create({
      senderUserId,
      senderTenantId,
      receiverUserId,
      receiverTenantId,
      connectionType,
      status: 'pending',
      message: message?.trim() || null,
    });
    await this.reqRepo.save(req);

    // Notify receiver
    const senderName = `${sender.firstName} ${sender.lastName}`.trim();
    if (receiverUserId) {
      void this.pushService.sendToUser(
        receiverUserId,
        '🔗 Yeni Bağlantı İsteği',
        `${senderName} size bağlantı isteği gönderdi.`,
        { type: 'connection_request', requestId: req.id },
      );
    }
    if (receiverTenantId) {
      // Notify club admins
      const admins = await this.usersRepo.find({
        where: { tenantId: receiverTenantId, role: UserRole.ADMINISTRATOR },
      });
      for (const admin of admins) {
        void this.pushService.sendToUser(
          admin.id,
          '🔗 Yeni Bağlantı İsteği',
          `${senderName} kulübünüze bağlantı isteği gönderdi.`,
          { type: 'connection_request', requestId: req.id },
        );
      }
    }

    return { ok: true, requestId: req.id, connectionType };
  }

  /** Kulüp admin olarak bağlantı isteği gönder */
  async sendRequestAsClub(admin: User, receiverPublicId: string, message?: string) {
    const receiver = await this.findByPublicId(receiverPublicId);
    if (receiver.type !== 'user')
      throw new BadRequestException('Kulüp sadece kullanıcılara istek gönderebilir');

    const connectionType =
      receiver.role === UserRole.TRAINER || receiver.role === UserRole.INDEPENDENT_TRAINER
        ? 'club_to_trainer'
        : 'club_to_member';

    const existing = await this.reqRepo.findOne({
      where: { senderTenantId: admin.tenantId, receiverUserId: receiver.id, status: 'pending' },
    });
    if (existing) throw new ConflictException('Zaten bekleyen bir isteğiniz var');

    const req = this.reqRepo.create({
      senderUserId: null,
      senderTenantId: admin.tenantId,
      receiverUserId: receiver.id,
      receiverTenantId: null,
      connectionType,
      status: 'pending',
      message: message?.trim() || null,
    });
    await this.reqRepo.save(req);

    const tenant = await this.tenantsRepo.findOne({ where: { id: admin.tenantId } });
    void this.pushService.sendToUser(
      receiver.id,
      '🔗 Kulüp Daveti',
      `${tenant?.name ?? 'Bir kulüp'} sizi davet ediyor.`,
      { type: 'connection_request', requestId: req.id },
    );

    return { ok: true, requestId: req.id, connectionType };
  }

  /** İsteği kabul et */
  async acceptRequest(user: User, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId, status: 'pending' },
      relations: ['senderUser', 'senderTenant', 'receiverUser', 'receiverTenant'],
    });
    if (!req) throw new NotFoundException('İstek bulunamadı');

    // Verify the user is the receiver
    const isReceiver =
      req.receiverUserId === user.id ||
      (req.receiverTenantId &&
        user.tenantId === req.receiverTenantId &&
        user.role === UserRole.ADMINISTRATOR);
    if (!isReceiver) throw new BadRequestException('Bu isteği kabul etme yetkiniz yok');

    req.status = 'accepted';
    req.respondedAt = new Date();
    await this.reqRepo.save(req);

    // Execute the connection based on type
    await this.executeConnection(req);

    // Notify sender
    const acceptorName = `${user.firstName} ${user.lastName}`.trim();
    if (req.senderUserId) {
      void this.pushService.sendToUser(
        req.senderUserId,
        '✅ Bağlantı Kabul Edildi',
        `${acceptorName} bağlantı isteğinizi kabul etti.`,
        { type: 'connection_accepted' },
      );
    }
    if (req.senderTenantId) {
      const admins = await this.usersRepo.find({
        where: { tenantId: req.senderTenantId, role: UserRole.ADMINISTRATOR },
      });
      for (const admin of admins) {
        void this.pushService.sendToUser(
          admin.id,
          '✅ Bağlantı Kabul Edildi',
          `${acceptorName} davetinizi kabul etti.`,
          { type: 'connection_accepted' },
        );
      }
    }

    return { ok: true, status: 'accepted' };
  }

  /** İsteği reddet */
  async rejectRequest(user: User, requestId: string, reason?: string) {
    const req = await this.reqRepo.findOne({ where: { id: requestId, status: 'pending' } });
    if (!req) throw new NotFoundException('İstek bulunamadı');

    const isReceiver =
      req.receiverUserId === user.id ||
      (req.receiverTenantId &&
        user.tenantId === req.receiverTenantId &&
        user.role === UserRole.ADMINISTRATOR);
    if (!isReceiver) throw new BadRequestException('Bu isteği reddetme yetkiniz yok');

    req.status = 'rejected';
    req.rejectReason = reason?.trim() || null;
    req.respondedAt = new Date();
    await this.reqRepo.save(req);

    return { ok: true, status: 'rejected' };
  }

  /** İsteği iptal et (gönderen tarafından) */
  async cancelRequest(user: User, requestId: string) {
    const req = await this.reqRepo.findOne({ where: { id: requestId, status: 'pending' } });
    if (!req) throw new NotFoundException('İstek bulunamadı');

    const isSender =
      req.senderUserId === user.id ||
      (req.senderTenantId &&
        user.tenantId === req.senderTenantId &&
        user.role === UserRole.ADMINISTRATOR);
    if (!isSender) throw new BadRequestException('Bu isteği iptal etme yetkiniz yok');

    req.status = 'cancelled';
    req.respondedAt = new Date();
    await this.reqRepo.save(req);

    return { ok: true, status: 'cancelled' };
  }

  /** Gelen istekler */
  async getIncomingRequests(user: User) {
    const requests = await this.reqRepo.find({
      where: [
        { receiverUserId: user.id, status: 'pending' },
        ...(user.role === UserRole.ADMINISTRATOR
          ? [{ receiverTenantId: user.tenantId, status: 'pending' as const }]
          : []),
      ],
      relations: ['senderUser', 'senderTenant'],
      order: { createdAt: 'DESC' },
    });
    return requests.map((r) => this.formatRequest(r, 'incoming'));
  }

  /** Gönderilen istekler */
  async getSentRequests(user: User) {
    const requests = await this.reqRepo.find({
      where: [
        { senderUserId: user.id },
        ...(user.role === UserRole.ADMINISTRATOR ? [{ senderTenantId: user.tenantId }] : []),
      ],
      relations: ['receiverUser', 'receiverTenant'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return requests.map((r) => this.formatRequest(r, 'sent'));
  }

  /** Kabul edilen bağlantılar */
  async getAcceptedConnections(user: User) {
    const requests = await this.reqRepo.find({
      where: [
        { senderUserId: user.id, status: 'accepted' },
        { receiverUserId: user.id, status: 'accepted' },
        ...(user.role === UserRole.ADMINISTRATOR
          ? [
              { senderTenantId: user.tenantId, status: 'accepted' as const },
              { receiverTenantId: user.tenantId, status: 'accepted' as const },
            ]
          : []),
      ],
      relations: ['senderUser', 'senderTenant', 'receiverUser', 'receiverTenant'],
      order: { respondedAt: 'DESC' },
      take: 100,
    });
    return requests.map((r) => this.formatRequest(r, 'accepted'));
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async executeConnection(req: ConnectionRequest) {
    switch (req.connectionType) {
      case 'member_to_trainer':
      case 'trainer_to_member': {
        // Create trainer_member_link
        const trainerId =
          req.connectionType === 'member_to_trainer'
            ? await this.getTrainerIdForUser(req.receiverUserId!)
            : await this.getTrainerIdForUser(req.senderUserId!);
        const memberUserId =
          req.connectionType === 'member_to_trainer' ? req.senderUserId! : req.receiverUserId!;
        if (trainerId) {
          const existing = await this.linksRepo.findOne({ where: { trainerId, memberUserId } });
          if (existing) {
            existing.status = 'active';
            await this.linksRepo.save(existing);
          } else {
            const trainer = await this.trainersRepo.findOne({ where: { id: trainerId } });
            await this.linksRepo.save(
              this.linksRepo.create({
                tenantId:
                  trainer?.tenantId ?? req.senderUser?.tenantId ?? req.receiverUser?.tenantId ?? '',
                trainerId,
                memberUserId,
                status: 'active',
                source:
                  req.connectionType === 'member_to_trainer' ? 'member_request' : 'trainer_added',
              }),
            );
          }
        }
        break;
      }
      case 'trainer_to_club':
      case 'club_to_trainer': {
        // Move trainer to club tenant
        const trainerUserId =
          req.connectionType === 'trainer_to_club' ? req.senderUserId! : req.receiverUserId!;
        const clubTenantId =
          req.connectionType === 'trainer_to_club' ? req.receiverTenantId! : req.senderTenantId!;
        await this.usersRepo.update(
          { id: trainerUserId },
          { tenantId: clubTenantId, role: UserRole.TRAINER },
        );
        const trainer = await this.trainersRepo.findOne({ where: { userId: trainerUserId } });
        if (trainer) {
          await this.trainersRepo.update({ id: trainer.id }, { tenantId: clubTenantId });
        }
        break;
      }
      case 'member_to_club':
      case 'club_to_member': {
        // Move member to club tenant
        const memberUserId =
          req.connectionType === 'member_to_club' ? req.senderUserId! : req.receiverUserId!;
        const clubTenantId =
          req.connectionType === 'member_to_club' ? req.receiverTenantId! : req.senderTenantId!;
        await this.usersRepo.update(
          { id: memberUserId },
          { tenantId: clubTenantId, accountStatus: MemberAccountStatus.ACTIVE },
        );
        break;
      }
    }
  }

  private async getTrainerIdForUser(userId: string): Promise<string | null> {
    const trainer = await this.trainersRepo.findOne({ where: { userId } });
    return trainer?.id ?? null;
  }

  private formatRequest(r: ConnectionRequest, direction: string) {
    const senderName = r.senderUser
      ? `${r.senderUser.firstName} ${r.senderUser.lastName}`.trim()
      : (r.senderTenant?.name ?? '');
    const receiverName = r.receiverUser
      ? `${r.receiverUser.firstName} ${r.receiverUser.lastName}`.trim()
      : (r.receiverTenant?.name ?? '');
    return {
      id: r.id,
      direction,
      connectionType: r.connectionType,
      status: r.status,
      message: r.message,
      rejectReason: r.rejectReason,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      sender: {
        name: senderName,
        publicId: r.senderUser?.publicId ?? r.senderTenant?.publicId ?? null,
        role: r.senderUser?.role ?? (r.senderTenantId ? 'club' : null),
      },
      receiver: {
        name: receiverName,
        publicId: r.receiverUser?.publicId ?? r.receiverTenant?.publicId ?? null,
        role: r.receiverUser?.role ?? (r.receiverTenantId ? 'club' : null),
      },
    };
  }
}
