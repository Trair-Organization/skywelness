import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../database/entities/package.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';

@Injectable()
export class AdminMembersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Package)
    private readonly packagesRepo: Repository<Package>,
    @InjectRepository(Trainer)
    private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
  ) {}

  /** Dashboard istatistikleri */
  async getDashboardStats(tenantId: string) {
    const totalMembers = await this.usersRepo.count({
      where: { tenantId, role: UserRole.MEMBER },
    });
    const activeMembers = await this.usersRepo.count({
      where: { tenantId, role: UserRole.MEMBER, accountStatus: MemberAccountStatus.ACTIVE },
    });
    const pendingMembers = await this.usersRepo.count({
      where: {
        tenantId,
        role: UserRole.MEMBER,
        accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      },
    });
    const totalTrainers = await this.trainersRepo.count({ where: { tenantId } });
    const totalEvents = await this.eventsRepo.count({ where: { tenantId } });
    const upcomingEvents = await this.eventsRepo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.startsAt > NOW()')
      .getCount();

    // Son 30 günde kayıt olan üyeler
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newMembersThisMonth = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.role = :role', { role: UserRole.MEMBER })
      .andWhere('u.createdAt >= :since', { since: thirtyDaysAgo })
      .getCount();

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      totalTrainers,
      totalEvents,
      upcomingEvents,
      newMembersThisMonth,
    };
  }

  /** Tüm üyeleri listele (filtreleme destekli) */
  async listAllMembers(tenantId: string, status?: string, search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.role = :role', { role: UserRole.MEMBER });

    if (status && status !== 'all') {
      qb.andWhere('u.accountStatus = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(u.firstName) LIKE :s OR LOWER(u.lastName) LIKE :s OR LOWER(u.email) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    qb.select([
      'u.id',
      'u.email',
      'u.firstName',
      'u.lastName',
      'u.phone',
      'u.photoUrl',
      'u.accountStatus',
      'u.lastLogin',
      'u.createdAt',
    ]);
    qb.orderBy('u.createdAt', 'DESC');
    qb.take(200);

    return qb.getMany();
  }

  /** Eğitmenleri listele */
  async listTrainers(tenantId: string) {
    const trainers = await this.trainersRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return trainers.map((t) => ({
      id: t.id,
      userId: t.userId,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      email: t.user.email,
      phone: t.user.phone,
      photoUrl: t.photoUrl,
      bio: t.bio,
      specializations: t.specializations,
      certifications: t.certifications,
      offersSessionTypes: t.offersSessionTypes,
      avgRating: t.avgRating,
      totalSessions: t.totalSessions,
      createdAt: t.createdAt,
    }));
  }

  async listPendingMembers(tenantId: string) {
    return this.usersRepo.find({
      where: {
        tenantId,
        role: UserRole.MEMBER,
        accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      },
      select: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
  }

  async approveMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) {
      throw new NotFoundException('Member not found');
    }
    if (user.accountStatus !== MemberAccountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Member is not awaiting approval');
    }
    await this.usersRepo.update({ id: userId }, { accountStatus: MemberAccountStatus.ACTIVE });
    return { ok: true as const };
  }

  async rejectMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) {
      throw new NotFoundException('Member not found');
    }
    if (user.accountStatus !== MemberAccountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Member is not awaiting approval');
    }
    await this.usersRepo.update({ id: userId }, { accountStatus: MemberAccountStatus.REJECTED });
    return { ok: true as const };
  }

  async listMemberPackages(tenantId: string, userId: string) {
    const member = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
      select: ['id'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    const rows = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .leftJoinAndSelect('p.assignedTrainer', 'tr')
      .leftJoinAndSelect('tr.user', 'trUser')
      .where('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
    return rows.map((p) => ({
      id: p.id,
      status: p.status,
      remainingSessions: p.remainingSessions,
      expiresAt: p.expiresAt,
      assignedTrainerId: p.assignedTrainerId ?? null,
      assignedTrainerName: p.assignedTrainer
        ? `${p.assignedTrainer.user?.firstName ?? ''} ${p.assignedTrainer.user?.lastName ?? ''}`.trim()
        : null,
      packageType: {
        id: p.packageType.id,
        name: p.packageType.name,
        sessionType: p.packageType.sessionType,
      },
    }));
  }

  async assignPackageTrainer(
    tenantId: string,
    userId: string,
    packageId: string,
    trainerId: string | null,
  ) {
    const member = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
      select: ['id'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    const pkg = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .where('p.id = :id', { id: packageId })
      .andWhere('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    let nextTrainerId: string | null = null;
    if (trainerId) {
      const trainer = await this.trainersRepo.findOne({
        where: { id: trainerId, tenantId },
      });
      if (!trainer) {
        throw new NotFoundException('Trainer not found');
      }
      const sessionKey = pkg.packageType.sessionType;
      if (
        !Array.isArray(trainer.offersSessionTypes) ||
        !trainer.offersSessionTypes.includes(sessionKey)
      ) {
        throw new BadRequestException('Trainer does not offer this package type');
      }
      nextTrainerId = trainer.id;
    }

    pkg.assignedTrainerId = nextTrainerId;
    await this.packagesRepo.save(pkg);
    return { ok: true as const, packageId: pkg.id, assignedTrainerId: nextTrainerId };
  }
}
