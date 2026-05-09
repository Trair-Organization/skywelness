import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminMembersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Package)
    private readonly packagesRepo: Repository<Package>,
    @InjectRepository(PackageType)
    private readonly packageTypesRepo: Repository<PackageType>,
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
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

  // ─── Eğitmen CRUD ────────────────────────────────────────────────────────────

  async createTrainer(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      password: string;
      bio?: string;
      specializations?: string[];
      certifications?: string[];
      offersSessionTypes?: string[];
      photoUrl?: string;
    },
  ) {
    // Kullanıcı oluştur
    const existing = await this.usersRepo.findOne({
      where: { tenantId, email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const username = data.email.split('@')[0] + '_' + Date.now().toString(36);

    const user = this.usersRepo.create({
      tenantId,
      email: data.email.toLowerCase().trim(),
      username,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      role: UserRole.TRAINER,
      accountStatus: MemberAccountStatus.ACTIVE,
    });
    await this.usersRepo.save(user);

    const trainer = this.trainersRepo.create({
      userId: user.id,
      tenantId,
      bio: data.bio?.trim() || null,
      specializations: data.specializations || [],
      certifications: data.certifications || [],
      offersSessionTypes: data.offersSessionTypes || ['personal_training'],
      photoUrl: data.photoUrl?.trim() || null,
    });
    await this.trainersRepo.save(trainer);

    return {
      id: trainer.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  async updateTrainer(
    tenantId: string,
    trainerId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      bio?: string;
      specializations?: string[];
      certifications?: string[];
      offersSessionTypes?: string[];
      photoUrl?: string;
    },
  ) {
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId, tenantId },
      relations: ['user'],
    });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    // User bilgilerini güncelle
    if (data.firstName !== undefined) trainer.user.firstName = data.firstName.trim();
    if (data.lastName !== undefined) trainer.user.lastName = data.lastName.trim();
    if (data.phone !== undefined) trainer.user.phone = data.phone?.trim() || null;
    await this.usersRepo.save(trainer.user);

    // Trainer bilgilerini güncelle
    if (data.bio !== undefined) trainer.bio = data.bio?.trim() || null;
    if (data.specializations !== undefined) trainer.specializations = data.specializations;
    if (data.certifications !== undefined) trainer.certifications = data.certifications;
    if (data.offersSessionTypes !== undefined) trainer.offersSessionTypes = data.offersSessionTypes;
    if (data.photoUrl !== undefined) trainer.photoUrl = data.photoUrl?.trim() || null;
    await this.trainersRepo.save(trainer);

    return { ok: true as const };
  }

  async deleteTrainer(tenantId: string, trainerId: string) {
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId, tenantId },
    });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');
    // Kullanıcıyı da sil (cascade ile trainer silinir)
    await this.usersRepo.delete({ id: trainer.userId });
    return { ok: true as const };
  }

  /** Eğitmen bazlı istatistikler */
  async getTrainerStats(tenantId: string, trainerId: string) {
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId, tenantId },
      relations: ['user'],
    });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const totalReservations = await this.reservationsRepo.count({
      where: { trainerId, tenantId },
    });
    const completedSessions = await this.reservationsRepo.count({
      where: { trainerId, tenantId, status: 'completed' as never },
    });
    const confirmedSessions = await this.reservationsRepo.count({
      where: { trainerId, tenantId, status: 'confirmed' as never },
    });
    const cancelledSessions = await this.reservationsRepo.count({
      where: { trainerId, tenantId, status: 'cancelled' as never },
    });

    // Bu ay yapılan seanslar
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonthSessions = await this.reservationsRepo
      .createQueryBuilder('r')
      .where('r.trainerId = :trainerId', { trainerId })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: 'completed' })
      .andWhere('r.startTime >= :since', { since: startOfMonth })
      .getCount();

    return {
      trainerId,
      trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`,
      totalReservations,
      completedSessions,
      confirmedSessions,
      cancelledSessions,
      thisMonthSessions,
      totalSessions: trainer.totalSessions,
      avgRating: trainer.avgRating,
    };
  }

  // ─── Paket Tipi CRUD ─────────────────────────────────────────────────────────

  async listPackageTypes(tenantId: string) {
    return this.packageTypesRepo.find({
      where: { tenantId },
      order: { sessionType: 'ASC', name: 'ASC' },
    });
  }

  async createPackageType(
    tenantId: string,
    data: {
      name: string;
      sessionCount: number;
      price: number;
      validityDays: number;
      sessionType: string;
    },
  ) {
    const pt = this.packageTypesRepo.create({
      tenantId,
      name: data.name.trim(),
      sessionCount: data.sessionCount,
      price: data.price.toString(),
      validityDays: data.validityDays,
      sessionType: data.sessionType as never,
      active: true,
    });
    return this.packageTypesRepo.save(pt);
  }

  async updatePackageType(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      sessionCount: number;
      price: number;
      validityDays: number;
      sessionType: string;
      active: boolean;
    }>,
  ) {
    const pt = await this.packageTypesRepo.findOne({ where: { id, tenantId } });
    if (!pt) throw new NotFoundException('Paket tipi bulunamadı');
    if (data.name !== undefined) pt.name = data.name.trim();
    if (data.sessionCount !== undefined) pt.sessionCount = data.sessionCount;
    if (data.price !== undefined) pt.price = data.price.toString();
    if (data.validityDays !== undefined) pt.validityDays = data.validityDays;
    if (data.sessionType !== undefined) pt.sessionType = data.sessionType as never;
    if (data.active !== undefined) pt.active = data.active;
    return this.packageTypesRepo.save(pt);
  }

  async deletePackageType(tenantId: string, id: string) {
    const pt = await this.packageTypesRepo.findOne({ where: { id, tenantId } });
    if (!pt) throw new NotFoundException('Paket tipi bulunamadı');
    await this.packageTypesRepo.remove(pt);
    return { ok: true as const };
  }

  // ─── Üyeye Paket Atama ───────────────────────────────────────────────────────

  async assignPackageToMember(
    tenantId: string,
    userId: string,
    data: { packageTypeId: string; assignedTrainerId?: string },
  ) {
    const member = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    const pt = await this.packageTypesRepo.findOne({
      where: { id: data.packageTypeId, tenantId, active: true },
    });
    if (!pt) throw new NotFoundException('Paket tipi bulunamadı');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pt.validityDays);

    const pkg = this.packagesRepo.create({
      userId,
      packageTypeId: pt.id,
      remainingSessions: pt.sessionCount,
      expiresAt: expiresAt.toISOString().slice(0, 10),
      assignedTrainerId: data.assignedTrainerId || null,
      status: 'active' as never,
    });
    await this.packagesRepo.save(pkg);
    return { ok: true as const, packageId: pkg.id };
  }
}
