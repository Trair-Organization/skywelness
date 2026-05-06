import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberAccountStatus, UserRole } from '../database/enums';
import { PlatformAdminAuditLog } from '../database/entities/platform-admin-audit-log.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { User } from '../database/entities/user.entity';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { ManageUserDto } from './dto/manage-user.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(TrainerApplication)
    private readonly trainerApplicationsRepo: Repository<TrainerApplication>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Trainer)
    private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(PlatformAdminAuditLog)
    private readonly auditLogsRepo: Repository<PlatformAdminAuditLog>,
  ) {}

  private async logAction(params: {
    action: string;
    targetType: string;
    targetId: string;
    actorUserId?: string | null;
    details?: Record<string, unknown>;
  }) {
    const row = this.auditLogsRepo.create({
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      actorUserId: params.actorUserId ?? null,
      details: params.details ?? {},
    });
    await this.auditLogsRepo.save(row);
  }

  async getOverview() {
    const [tenants, users, trainers, pendingTrainerApplications, pendingMembers] =
      await Promise.all([
        this.tenantsRepo.count(),
        this.usersRepo.count(),
        this.trainersRepo.count(),
        this.trainerApplicationsRepo.count({ where: { status: 'pending' } }),
        this.usersRepo.count({ where: { accountStatus: MemberAccountStatus.PENDING_APPROVAL } }),
      ]);
    return { tenants, users, trainers, pendingTrainerApplications, pendingMembers };
  }

  async listTenants(q?: string) {
    const query = this.tenantsRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    if (q?.trim()) {
      query.andWhere('(LOWER(t.name) LIKE :q OR LOWER(t.subdomain) LIKE :q)', {
        q: `%${q.trim().toLowerCase()}%`,
      });
    }
    const tenants = await query.getMany();
    if (tenants.length === 0) return [];
    const tenantIds = tenants.map((tenant) => tenant.id);
    const [userCounts, trainerCounts] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .select('u.tenantId', 'tenantId')
        .addSelect('COUNT(*)', 'count')
        .where('u.tenantId IN (:...tenantIds)', { tenantIds })
        .groupBy('u.tenantId')
        .getRawMany<{ tenantId: string; count: string }>(),
      this.trainersRepo
        .createQueryBuilder('tr')
        .select('tr.tenantId', 'tenantId')
        .addSelect('COUNT(*)', 'count')
        .where('tr.tenantId IN (:...tenantIds)', { tenantIds })
        .groupBy('tr.tenantId')
        .getRawMany<{ tenantId: string; count: string }>(),
    ]);
    const userCountMap = new Map(userCounts.map((row) => [row.tenantId, Number(row.count)]));
    const trainerCountMap = new Map(trainerCounts.map((row) => [row.tenantId, Number(row.count)]));
    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      isActive: tenant.settings?.['isActive'] !== false,
      createdAt: tenant.createdAt,
      userCount: userCountMap.get(tenant.id) ?? 0,
      trainerCount: trainerCountMap.get(tenant.id) ?? 0,
    }));
  }

  async createTenant(dto: CreateTenantDto, reviewer: User) {
    const name = dto.name.trim();
    const subdomain = dto.subdomain.trim().toLowerCase();
    const existing = await this.tenantsRepo.findOne({ where: { subdomain }, select: ['id'] });
    if (existing) {
      throw new BadRequestException('Subdomain already exists');
    }
    const tenant = this.tenantsRepo.create({
      name,
      subdomain,
      branding: {},
      settings: { isActive: true },
    });
    await this.tenantsRepo.save(tenant);
    await this.logAction({
      action: 'tenant.create',
      targetType: 'tenant',
      targetId: tenant.id,
      actorUserId: reviewer.id,
      details: { name: tenant.name, subdomain: tenant.subdomain },
    });
    return { ok: true, id: tenant.id };
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto, reviewer: User) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const nextSettings = { ...(tenant.settings ?? {}) };
    if (typeof dto.isActive === 'boolean') {
      nextSettings['isActive'] = dto.isActive;
    }
    const nextName = dto.name?.trim();
    if (nextName) {
      tenant.name = nextName;
    }
    tenant.settings = nextSettings;
    await this.tenantsRepo.save(tenant);
    await this.logAction({
      action: 'tenant.update',
      targetType: 'tenant',
      targetId: tenant.id,
      actorUserId: reviewer.id,
      details: {
        previousName: tenant.name,
        nextName: nextName ?? tenant.name,
        isActive: nextSettings['isActive'] !== false,
      },
    });
    return { ok: true };
  }

  async listUsers(filters: { tenantId?: string; role?: string; q?: string }) {
    const query = this.usersRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.tenant', 'tenant')
      .orderBy('u.createdAt', 'DESC');
    if (filters.tenantId?.trim()) {
      query.andWhere('u.tenantId = :tenantId', { tenantId: filters.tenantId.trim() });
    }
    if (filters.role?.trim()) {
      query.andWhere('u.role = :role', { role: filters.role.trim() });
    }
    if (filters.q?.trim()) {
      query.andWhere(
        '(LOWER(u.firstName) LIKE :q OR LOWER(u.lastName) LIKE :q OR LOWER(u.email) LIKE :q OR LOWER(u.username) LIKE :q)',
        { q: `%${filters.q.trim().toLowerCase()}%` },
      );
    }
    const users = await query.getMany();
    return users.map((user) => ({
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    }));
  }

  async updateUserStatus(userId: string, status: MemberAccountStatus) {
    const row = await this.usersRepo.findOne({ where: { id: userId }, select: ['id'] });
    if (!row) throw new NotFoundException('User not found');
    await this.usersRepo.update({ id: userId }, { accountStatus: status });
    return { ok: true };
  }

  async manageUser(userId: string, dto: ManageUserDto, reviewer: User) {
    const row = await this.usersRepo.findOne({ where: { id: userId } });
    if (!row) throw new NotFoundException('User not found');
    let nextTenantId = row.tenantId;
    if (dto.tenantId) {
      const tenant = await this.tenantsRepo.findOne({
        where: { id: dto.tenantId },
        select: ['id'],
      });
      if (!tenant) throw new BadRequestException('Target tenant not found');
      nextTenantId = tenant.id;
    }
    const nextRole = dto.role ?? row.role;
    const nextStatus = dto.status ?? row.accountStatus;
    await this.usersRepo.update(
      { id: row.id },
      {
        tenantId: nextTenantId,
        role: nextRole,
        accountStatus: nextStatus,
      },
    );
    await this.trainersRepo.update(
      { userId: row.id },
      {
        tenantId: nextTenantId,
      },
    );
    await this.logAction({
      action: 'user.manage',
      targetType: 'user',
      targetId: row.id,
      actorUserId: reviewer.id,
      details: {
        previousTenantId: row.tenantId,
        nextTenantId,
        previousRole: row.role,
        nextRole,
        previousStatus: row.accountStatus,
        nextStatus,
        note: dto.note?.trim() || null,
      },
    });
    return { ok: true };
  }

  async listTrainers(filters: { tenantId?: string; q?: string }) {
    const query = this.trainersRepo
      .createQueryBuilder('tr')
      .leftJoinAndSelect('tr.user', 'u')
      .leftJoinAndSelect('tr.tenant', 'tenant')
      .orderBy('tr.createdAt', 'DESC');
    if (filters.tenantId?.trim()) {
      query.andWhere('tr.tenantId = :tenantId', { tenantId: filters.tenantId.trim() });
    }
    if (filters.q?.trim()) {
      query.andWhere(
        '(LOWER(u.firstName) LIKE :q OR LOWER(u.lastName) LIKE :q OR LOWER(u.email) LIKE :q)',
        {
          q: `%${filters.q.trim().toLowerCase()}%`,
        },
      );
    }
    const rows = await query.getMany();
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenant?.name ?? null,
      firstName: row.user?.firstName ?? '',
      lastName: row.user?.lastName ?? '',
      email: row.user?.email ?? '',
      phone: row.user?.phone ?? null,
      avgRating: row.avgRating,
      totalSessions: row.totalSessions,
      offersSessionTypes: row.offersSessionTypes ?? [],
      createdAt: row.createdAt,
    }));
  }

  async assignTrainerTenant(trainerId: string, tenantId: string, reviewer: User, note?: string) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId } });
    if (!trainer) throw new NotFoundException('Trainer not found');
    const targetTenant = await this.tenantsRepo.findOne({
      where: { id: tenantId },
      select: ['id'],
    });
    if (!targetTenant) throw new BadRequestException('Target tenant not found');
    await this.trainersRepo.update({ id: trainer.id }, { tenantId: targetTenant.id });
    await this.usersRepo.update(
      { id: trainer.userId },
      { tenantId: targetTenant.id, role: UserRole.TRAINER },
    );
    await this.logAction({
      action: 'trainer.assignTenant',
      targetType: 'trainer',
      targetId: trainer.id,
      actorUserId: reviewer.id,
      details: {
        previousTenantId: trainer.tenantId,
        nextTenantId: targetTenant.id,
        note: note?.trim() || null,
      },
    });
    return { ok: true };
  }

  async listAuditLogs(limit = 100) {
    const take = Math.min(300, Math.max(1, limit));
    const rows = await this.auditLogsRepo.find({
      order: { createdAt: 'DESC' },
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      actorUserId: row.actorUserId,
      details: row.details,
      createdAt: row.createdAt,
    }));
  }

  async listPendingTrainerApplications() {
    const rows = await this.trainerApplicationsRepo.find({
      where: { status: 'pending' },
      relations: { user: true, trainer: true, tenant: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      trainer: {
        id: row.trainerId,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
        phone: row.user.phone,
        tenantSubdomain: row.tenant.subdomain,
        offersSessionTypes: row.trainer.offersSessionTypes,
        specialties: row.trainer.specializations,
        preferredClubSubdomain: row.preferredClubSubdomain,
      },
    }));
  }

  async approveTrainerApplication(applicationId: string, reviewer: User, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('Trainer application not found');
    }
    if (app.status !== 'pending') {
      throw new BadRequestException('Trainer application already reviewed');
    }
    await this.trainerApplicationsRepo.update(
      { id: app.id },
      {
        status: 'approved',
        adminNote: note?.trim() || null,
        reviewedByUserId: reviewer.id,
        reviewedAt: new Date(),
      },
    );
    await this.usersRepo.update({ id: app.userId }, { accountStatus: MemberAccountStatus.ACTIVE });
    await this.logAction({
      action: 'trainerApplication.approve',
      targetType: 'trainer_application',
      targetId: app.id,
      actorUserId: reviewer.id,
      details: { note: note?.trim() || null },
    });
    return { ok: true };
  }

  async rejectTrainerApplication(applicationId: string, reviewer: User, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('Trainer application not found');
    }
    if (app.status !== 'pending') {
      throw new BadRequestException('Trainer application already reviewed');
    }
    await this.trainerApplicationsRepo.update(
      { id: app.id },
      {
        status: 'rejected',
        adminNote: note?.trim() || null,
        reviewedByUserId: reviewer.id,
        reviewedAt: new Date(),
      },
    );
    await this.usersRepo.update(
      { id: app.userId },
      { accountStatus: MemberAccountStatus.REJECTED },
    );
    await this.logAction({
      action: 'trainerApplication.reject',
      targetType: 'trainer_application',
      targetId: app.id,
      actorUserId: reviewer.id,
      details: { note: note?.trim() || null },
    });
    return { ok: true };
  }
}
