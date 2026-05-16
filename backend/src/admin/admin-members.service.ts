import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Availability } from '../database/entities/availability.entity';
import { Membership } from '../database/entities/membership.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { User } from '../database/entities/user.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import {
  MemberAccountStatus,
  ReservationStatus,
  SessionType,
  UserRole,
  PackageStatus,
} from '../database/enums';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';
import { PushService } from '../notifications/push.service';
import { SmsService } from '../notifications/sms.service';
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
    @InjectRepository(TrainerApplication)
    private readonly trainerApplicationsRepo: Repository<TrainerApplication>,
    @InjectRepository(TrainerProfile)
    private readonly trainerProfilesRepo: Repository<TrainerProfile>,
    @InjectRepository(Availability)
    private readonly availabilityRepo: Repository<Availability>,
    @InjectRepository(Membership)
    private readonly membershipsRepo: Repository<Membership>,
    @InjectRepository(TrainerMemberLink)
    private readonly trainerMemberLinksRepo: Repository<TrainerMemberLink>,
    @InjectRepository(SpaTherapist)
    private readonly spaTherapistsRepo: Repository<SpaTherapist>,
    @InjectRepository(SpaService)
    private readonly spaServicesRepo: Repository<SpaService>,
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly pushService: PushService,
    private readonly smsService: SmsService,
    private readonly notifier: NotificationDispatcher,
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

    // Bugünün randevuları
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${today}T00:00:00`);
    const todayEnd = new Date(`${today}T23:59:59`);
    const todayReservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.trainer', 't')
      .leftJoinAndSelect('t.user', 'tu')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :start', { start: todayStart })
      .andWhere('r.startTime <= :end', { end: todayEnd })
      .orderBy('r.startTime', 'ASC')
      .getMany();

    const todayBookings = todayReservations.map((r) => ({
      id: r.id,
      time: r.startTime,
      status: r.status,
      sessionType: r.sessionType,
      trainerName: r.trainer?.user
        ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
        : null,
      memberName: r.user ? `${r.user.firstName} ${r.user.lastName}` : null,
    }));

    // Bu ayki gelir (paket satışları)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyRevenue = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoin('p.packageType', 'pt')
      .select('SUM(CAST(pt.price AS DECIMAL))', 'total')
      .addSelect('COUNT(p.id)', 'count')
      .where('pt.tenantId = :tenantId', { tenantId })
      .andWhere('p.createdAt >= :since', { since: startOfMonth })
      .getRawOne<{ total: string | null; count: string }>();

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      totalTrainers,
      totalEvents,
      upcomingEvents,
      newMembersThisMonth,
      todayBookings,
      todayBookingsCount: todayBookings.length,
      monthlyRevenue: Number(monthlyRevenue?.total || 0),
      monthlyPackagesSold: Number(monthlyRevenue?.count || 0),
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
        '(LOWER(u.firstName) LIKE :s OR LOWER(u.lastName) LIKE :s OR LOWER(u.email) LIKE :s OR u.phone LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    qb.select([
      'u.id',
      'u.email',
      'u.username',
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

    const members = await qb.getMany();

    // Membership ve paket bilgilerini toplu çek
    const memberIds = members.map((m) => m.id);
    if (memberIds.length === 0) return [];

    // Üyelik bitiş tarihleri
    const memberships = await this.membershipsRepo
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.userId IN (:...ids)', { ids: memberIds })
      .select(['m.userId', 'm.endDate', 'm.status'])
      .orderBy('m.createdAt', 'DESC')
      .getMany();
    const membershipMap = new Map<string, { endDate: string; status: string }>();
    for (const ms of memberships) {
      if (!membershipMap.has(ms.userId)) membershipMap.set(ms.userId, { endDate: ms.endDate, status: ms.status });
    }

    // Aktif paketlerin kalan seansları
    const packages = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .where('pt.tenantId = :tenantId', { tenantId })
      .andWhere('p.userId IN (:...ids)', { ids: memberIds })
      .andWhere('p.status = :active', { active: 'active' })
      .getMany();

    const ptMap = new Map<string, number>();
    const massageMap = new Map<string, number>();
    for (const pkg of packages) {
      const uid = pkg.userId;
      const sessions = pkg.remainingSessions || 0;
      if (pkg.packageType.sessionType === 'personal_training') {
        ptMap.set(uid, (ptMap.get(uid) || 0) + sessions);
      } else if (pkg.packageType.sessionType === 'massage') {
        massageMap.set(uid, (massageMap.get(uid) || 0) + sessions);
      }
    }

    return members.map((m) => ({
      ...m,
      membershipEndDate: membershipMap.get(m.id)?.endDate || null,
      membershipStatus: membershipMap.get(m.id)?.status || null,
      massageSessions: massageMap.get(m.id) || 0,
      ptSessions: ptMap.get(m.id) || 0,
    }));
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

    // Bildirimler
    void this.notifier.memberApproved(user).catch(() => {});

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

  /** Üye detay bilgisi (profil + paketler + son randevular + üyelik) */
  async getMemberDetail(tenantId: string, userId: string) {
    const member = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    // Üyelik
    const membership = await this.membershipsRepo.findOne({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
    });

    // Paketleri
    const packages = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .leftJoinAndSelect('p.assignedTrainer', 'tr')
      .leftJoinAndSelect('tr.user', 'trUser')
      .where('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    // Son randevular
    const reservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.trainer', 't')
      .leftJoinAndSelect('t.user', 'tu')
      .where('r.userId = :userId', { userId })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .orderBy('r.startTime', 'DESC')
      .take(20)
      .getMany();

    // Atanmış eğitmenler
    const trainerLinks = await this.trainerMemberLinksRepo.find({
      where: { memberUserId: userId, tenantId, status: 'active' },
      relations: ['trainer', 'trainer.user'],
    });

    return {
      id: member.id,
      username: (member as unknown as { username?: string }).username || null,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      photoUrl: member.photoUrl,
      accountStatus: member.accountStatus,
      lastLogin: member.lastLogin,
      createdAt: member.createdAt,
      assignedTrainers: trainerLinks.map((l) => ({
        linkId: l.id,
        trainerId: l.trainerId,
        trainerName: l.trainer?.user
          ? `${l.trainer.user.firstName} ${l.trainer.user.lastName}`.trim()
          : 'Eğitmen',
      })),
      membership: membership
        ? {
            id: membership.id,
            membershipType: membership.membershipType,
            startDate: membership.startDate,
            endDate: membership.endDate,
            status: membership.status,
            price: membership.price,
          }
        : null,
      packages: packages.map((p) => ({
        id: p.id,
        status: p.status,
        remainingSessions: p.remainingSessions,
        expiresAt: p.expiresAt,
        assignedTrainerName: p.assignedTrainer
          ? `${p.assignedTrainer.user?.firstName ?? ''} ${p.assignedTrainer.user?.lastName ?? ''}`.trim()
          : null,
        packageType: { name: p.packageType.name, sessionType: p.packageType.sessionType },
      })),
      reservations: reservations.map((r) => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        sessionType: r.sessionType,
        trainerName: r.trainer?.user
          ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
          : null,
      })),
    };
  }

  /** Son aktiviteler (yeni üyeler, randevular, paket satışları) */
  async getRecentActivity(tenantId: string) {
    const activities: Array<{ type: string; message: string; time: string }> = [];

    // Son 7 günde kayıt olan üyeler
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newMembers = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.role = :role', { role: UserRole.MEMBER })
      .andWhere('u.createdAt >= :since', { since: sevenDaysAgo })
      .orderBy('u.createdAt', 'DESC')
      .take(10)
      .getMany();

    for (const m of newMembers) {
      activities.push({
        type: 'new_member',
        message: `👤 ${m.firstName} ${m.lastName} üye oldu`,
        time: m.createdAt.toISOString(),
      });
    }

    // Son 7 günde oluşturulan randevular
    const recentReservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.trainer', 't')
      .leftJoinAndSelect('t.user', 'tu')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.createdAt >= :since', { since: sevenDaysAgo })
      .orderBy('r.createdAt', 'DESC')
      .take(10)
      .getMany();

    for (const r of recentReservations) {
      const memberName = r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Bilinmeyen';
      const trainerName = r.trainer?.user
        ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
        : '';
      const typeLabel = r.sessionType === SessionType.PERSONAL_TRAINING ? 'PT' : 'Masaj';
      const statusLabel =
        r.status === ReservationStatus.CONFIRMED
          ? 'Onaylı'
          : r.status === ReservationStatus.PENDING
            ? 'Bekliyor'
            : r.status;
      activities.push({
        type: 'reservation',
        message: `📅 ${memberName} → ${trainerName} (${typeLabel}) — ${statusLabel}`,
        time: r.createdAt.toISOString(),
      });
    }

    // Son 7 günde satılan paketler
    const recentPackages = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .innerJoinAndSelect('p.user', 'u')
      .where('pt.tenantId = :tenantId', { tenantId })
      .andWhere('p.createdAt >= :since', { since: sevenDaysAgo })
      .orderBy('p.createdAt', 'DESC')
      .take(10)
      .getMany();

    for (const p of recentPackages) {
      activities.push({
        type: 'package',
        message: `📦 ${p.user.firstName} ${p.user.lastName} — ${p.packageType.name} paketi satıldı`,
        time: p.createdAt.toISOString(),
      });
    }

    // Zamana göre sırala
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return activities.slice(0, 20);
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

    // Üyeye bildirim
    void this.notifier.packageAssignedToMember(member, pt.name).catch(() => {});

    return { ok: true as const, packageId: pkg.id };
  }

  // ─── Eğitmen Ajanda Yönetimi ─────────────────────────────────────────────────

  /** Admin: Tüm PT randevularını listele */
  async listPtReservations(tenantId: string, status?: string) {
    const qb = this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.trainer', 't')
      .leftJoinAndSelect('t.user', 'tu')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.trainerId IS NOT NULL')
      .andWhere('r.spaTherapistId IS NULL');
    if (status && status !== 'all') {
      qb.andWhere('r.status = :status', { status });
    }
    qb.orderBy('r.startTime', 'DESC').take(100);
    const rows = await qb.getMany();
    return rows.map(r => ({
      id: r.id,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      memberName: r.user ? `${r.user.firstName} ${r.user.lastName}` : null,
      memberPhone: r.user?.phone || null,
      trainerName: r.trainer?.user ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}` : null,
      sessionType: r.sessionType,
      createdAt: r.createdAt,
    }));
  }

  /** Admin: Masaj paketi satış geçmişi */
  async listSpaPackageSales(tenantId: string) {
    const rows = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .innerJoinAndSelect('p.user', 'u')
      .where('pt.tenantId = :tenantId', { tenantId })
      .andWhere('pt.sessionType = :st', { st: 'massage' })
      .orderBy('p.createdAt', 'DESC')
      .take(100)
      .getMany();
    return rows.map((p) => ({
      id: p.id,
      memberName: `${p.user.firstName} ${p.user.lastName}`,
      memberEmail: p.user.email,
      memberPhone: p.user.phone,
      packageName: p.packageType.name,
      sessionCount: p.packageType.sessionCount,
      remainingSessions: p.remainingSessions,
      usedSessions: p.packageType.sessionCount - p.remainingSessions,
      price: p.packageType.price,
      status: p.status,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
    }));
  }

  /** Admin: Tüm spa (masöz) randevularını listele */
  async listSpaReservations(tenantId: string, status?: string) {
    const qb = this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.spaTherapist', 'st')
      .leftJoinAndSelect('r.spaService', 'svc')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.spaTherapistId IS NOT NULL');
    if (status && status !== 'all') {
      qb.andWhere('r.status = :status', { status });
    }
    qb.orderBy('r.startTime', 'DESC').take(100);
    const rows = await qb.getMany();

    // Kalan seans bilgisi için paketleri toplu çek
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    let packageMap = new Map<string, number>();
    if (userIds.length > 0) {
      const packages = await this.packagesRepo
        .createQueryBuilder('p')
        .innerJoin('p.packageType', 'pt')
        .where('p.userId IN (:...ids)', { ids: userIds })
        .andWhere('pt.tenantId = :tenantId', { tenantId })
        .andWhere('pt.sessionType = :st', { st: 'massage' })
        .andWhere('p.status = :active', { active: 'active' })
        .select(['p.userId', 'p.remainingSessions'])
        .getMany();
      for (const p of packages) {
        packageMap.set(p.userId, (packageMap.get(p.userId) || 0) + p.remainingSessions);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      memberName: r.user ? `${r.user.firstName} ${r.user.lastName}` : null,
      memberEmail: r.user?.email || null,
      memberPhone: r.user?.phone || null,
      therapistName: r.spaTherapist?.name || null,
      serviceName: r.spaService?.name || null,
      serviceDuration: r.spaService?.durationMinutes || null,
      sessionCost: r.spaService?.sessionCost || 1,
      sessionsBefore: r.sessionsBefore ?? null,
      sessionsAfter: r.sessionsAfter ?? null,
      remainingSessions: packageMap.get(r.userId) ?? null,
      sessionType: r.sessionType,
      createdAt: r.createdAt,
    }));
  }

  /** Admin herhangi bir rezervasyonu iptal eder (pending veya confirmed) */
  async cancelReservationByAdmin(tenantId: string, reservationId: string) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException('Bu rezervasyon zaten iptal/tamamlanmış');
    }
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    await this.reservationsRepo.save(reservation);

    // Üyeye bildirim gönder
    if (reservation.user) {
      const date = reservation.startTime.toLocaleDateString('tr-TR');
      const time = reservation.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      void this.notifier
        .reservationCancelledForMember({ member: reservation.user, trainerName: '', date, time })
        .catch(() => {});
    }

    return { ok: true as const, cancelledReservationId: reservationId };
  }

  /** Admin bir rezervasyonu tamamlandı olarak işaretler */
  async completeReservationByAdmin(tenantId: string, reservationId: string) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId },
    });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('Bu rezervasyon zaten tamamlanmış');
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş rezervasyon tamamlanamaz');
    }
    reservation.status = ReservationStatus.COMPLETED;
    await this.reservationsRepo.save(reservation);
    return { ok: true as const, completedReservationId: reservationId };
  }

  /** Admin: Manuel SMS hatırlatma gönder */
  async sendManualReminder(tenantId: string, reservationId: string) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId },
      relations: ['user', 'trainer', 'spaTherapist'],
    });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
    if (!reservation.user) throw new BadRequestException('Üye bulunamadı');

    const date = reservation.startTime.toLocaleDateString('tr-TR');
    const time = reservation.startTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const providerName = reservation.spaTherapist?.name || '';
    const sessionType = reservation.spaTherapistId ? 'massage' : 'personal_training';

    await this.notifier.reservationReminder({
      member: reservation.user,
      providerName,
      sessionType: sessionType as 'massage' | 'personal_training',
      date,
      time,
      reservationId,
      window: 'day',
    });

    return { ok: true as const, sent: true };
  }

  /** Admin üye adına randevu oluşturur (telefonda arayan üye için) */
  async createReservationByAdmin(
    tenantId: string,
    data: {
      trainerId: string;
      userId: string;
      date: string;
      startTime: string;
      endTime: string;
      notes?: string | null;
    },
  ) {
    const trainer = await this.trainersRepo.findOne({ where: { id: data.trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const member = await this.usersRepo.findOne({
      where: { id: data.userId, tenantId, role: UserRole.MEMBER },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    // Availability kaydını bul
    const availability = await this.availabilityRepo.findOne({
      where: { trainerId: data.trainerId, date: data.date, startTime: data.startTime },
    });
    if (!availability) throw new BadRequestException('Bu saat dilimi müsait değil');

    // Zaten dolu mu kontrol et
    const startDateTime = new Date(`${data.date}T${data.startTime}Z`);
    const endDateTime = new Date(`${data.date}T${data.endTime}Z`);
    const existingReservation = await this.reservationsRepo.findOne({
      where: {
        trainerId: data.trainerId,
        tenantId,
        startTime: startDateTime,
        status: ReservationStatus.CONFIRMED,
      },
    });
    if (existingReservation) throw new BadRequestException('Bu saat zaten dolu');

    // Rezervasyon oluştur (paket olmadan, admin tarafından)
    const reservation = this.reservationsRepo.create({
      userId: data.userId,
      trainerId: data.trainerId,
      tenantId,
      sessionType: 'personal_training' as never,
      startTime: startDateTime,
      endTime: endDateTime,
      status: ReservationStatus.CONFIRMED,
      notes: data.notes?.trim() || 'Admin tarafından oluşturuldu',
      timeSlotId: null as never,
      packageId: null as never,
    });
    await this.reservationsRepo.save(reservation);

    // Bildirimler
    const trainerName = `${trainer.user?.firstName ?? ''} ${trainer.user?.lastName ?? ''}`.trim();
    const dateStr = startDateTime.toLocaleDateString('tr-TR');
    const timeStr = data.startTime.slice(0, 5);

    void this.notifier
      .reservationCreatedForMember({
        member,
        trainerName,
        date: dateStr,
        time: timeStr,
        sessionType: 'personal_training',
        reservationId: reservation.id,
      })
      .catch(() => {});

    void this.notifier
      .newBookingForTrainer({
        trainerUserId: trainer.userId,
        trainerPhone: null,
        memberName: `${member.firstName} ${member.lastName}`,
        date: dateStr,
        time: timeStr,
      })
      .catch(() => {});

    return { ok: true as const, reservationId: reservation.id };
  }

  /** Admin rezervasyonu başka tarihe taşır */
  async rescheduleReservation(
    tenantId: string,
    reservationId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException('Bu rezervasyon taşınamaz');
    }

    const newStart = new Date(`${newDate}T${newStartTime}Z`);
    const newEnd = new Date(`${newDate}T${newEndTime}Z`);

    // Hedef tarihte availability yoksa otomatik oluştur (admin override)
    const existingAvailability = await this.availabilityRepo.findOne({
      where: { trainerId: reservation.trainerId, date: newDate, startTime: newStartTime },
    });
    if (!existingAvailability) {
      const newAvailability = this.availabilityRepo.create({
        trainerId: reservation.trainerId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        available: true,
      });
      await this.availabilityRepo.save(newAvailability);
    }

    reservation.startTime = newStart;
    reservation.endTime = newEnd;
    await this.reservationsRepo.save(reservation);

    // Bildirimler
    if (reservation.user) {
      void this.notifier
        .reservationRescheduledForMember({
          member: reservation.user,
          trainerName: '',
          newDate: newStart.toLocaleDateString('tr-TR'),
          newTime: newStartTime.slice(0, 5),
          reservationId: reservationId,
        })
        .catch(() => {});
    }

    return { ok: true as const };
  }

  /** Tüm aktif eğitmenlerin belirli tarih aralığı için ajanda verisi */
  async listAllTrainersAgenda(tenantId: string, from: string, to: string) {
    const trainers = await this.trainersRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const trainerIds = trainers.map(t => t.id);
    if (trainerIds.length === 0) return [];

    const allSlots = await this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.trainerId IN (:...ids)', { ids: trainerIds })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .orderBy('a.date', 'ASC')
      .addOrderBy('a.startTime', 'ASC')
      .getMany();

    const allReservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.trainerId IN (:...ids)', { ids: trainerIds })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :fromTs', { fromTs: new Date(`${from}T00:00:00`) })
      .andWhere('r.startTime <= :toTs', { toTs: new Date(`${to}T23:59:59`) })
      .getMany();

    return trainers.map((trainer) => {
      const slots = allSlots.filter(s => s.trainerId === trainer.id);
      const reservations = allReservations.filter(r => r.trainerId === trainer.id);

      return {
        trainerId: trainer.id,
        trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`,
        photoUrl: trainer.photoUrl,
        slots: slots.map(slot => {
          const dateStr = typeof slot.date === 'string' ? slot.date.slice(0, 10) : new Date(slot.date).toISOString().slice(0, 10);
          const slotStart = new Date(`${dateStr}T${slot.startTime}`);
          const slotEnd = new Date(`${dateStr}T${slot.endTime}`);
          const reservation = reservations.find(r => r.startTime >= slotStart && r.startTime < slotEnd);
          return {
            id: slot.id,
            date: dateStr,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            available: slot.available,
            booked: !!reservation,
            reservation: reservation ? {
              id: reservation.id,
              memberName: reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : null,
              status: reservation.status,
            } : null,
          };
        }),
      };
    });
  }

  /** Eğitmenin belirli tarih aralığındaki müsaitlik kayıtlarını getir (rezervasyon durumu dahil) */
  async listTrainerSchedule(tenantId: string, trainerId: string, from: string, to: string) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const rows = await this.availabilityRepo.find({
      where: { trainerId, date: Between(from, to) },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    // Bu tarih aralığındaki onaylı/bekleyen rezervasyonları getir
    const reservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.trainerId = :trainerId', { trainerId })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from', { from: new Date(`${from}T00:00:00`) })
      .andWhere('r.startTime < :to', { to: new Date(`${to}T23:59:59`) })
      .getMany();

    return rows.map((row) => {
      // Bu slot'a denk gelen rezervasyon var mı?
      const dateStr =
        typeof row.date === 'string'
          ? row.date.slice(0, 10)
          : new Date(row.date).toISOString().slice(0, 10);
      const slotStart = new Date(`${dateStr}T${row.startTime}Z`);
      const slotEnd = new Date(`${dateStr}T${row.endTime}Z`);
      const booking = reservations.find((r) => {
        return r.startTime >= slotStart && r.startTime < slotEnd;
      });
      return {
        id: row.id,
        trainerId: row.trainerId,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        available: row.available,
        booked: !!booking,
        bookedBy: booking
          ? {
              reservationId: booking.id,
              firstName: booking.user?.firstName,
              lastName: booking.user?.lastName,
              phone: booking.user?.phone,
              status: booking.status,
            }
          : null,
      };
    });
  }

  /** Eğitmene müsaitlik bloğu ekle (tek gün, saat aralığı) */
  async addTrainerAvailability(
    tenantId: string,
    trainerId: string,
    data: { date: string; startTime: string; endTime: string; available?: boolean },
  ) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const row = this.availabilityRepo.create({
      trainerId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      available: data.available !== false,
    });
    return this.availabilityRepo.save(row);
  }

  /** Toplu müsaitlik ekle (haftalık tekrar) */
  async bulkAddTrainerAvailability(
    tenantId: string,
    trainerId: string,
    data: {
      startDate: string;
      endDate: string;
      weekdays: number[]; // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
      startTime: string;
      endTime: string;
    },
  ) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end)
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');

    const rows: Availability[] = [];
    const current = new Date(start);
    while (current <= end) {
      if (data.weekdays.includes(current.getDay())) {
        rows.push(
          this.availabilityRepo.create({
            trainerId,
            date: current.toISOString().slice(0, 10),
            startTime: data.startTime,
            endTime: data.endTime,
            available: true,
          }),
        );
      }
      current.setDate(current.getDate() + 1);
    }

    if (rows.length === 0) return { created: 0 };
    await this.availabilityRepo.save(rows);
    return { created: rows.length };
  }

  /** Müsaitlik kaydını güncelle */
  async updateTrainerAvailability(
    tenantId: string,
    trainerId: string,
    availabilityId: string,
    data: { startTime?: string; endTime?: string; available?: boolean },
  ) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const row = await this.availabilityRepo.findOne({ where: { id: availabilityId, trainerId } });
    if (!row) throw new NotFoundException('Müsaitlik kaydı bulunamadı');

    if (data.startTime !== undefined) row.startTime = data.startTime;
    if (data.endTime !== undefined) row.endTime = data.endTime;
    if (data.available !== undefined) row.available = data.available;
    return this.availabilityRepo.save(row);
  }

  /** Müsaitlik kaydını sil */
  async deleteTrainerAvailability(tenantId: string, trainerId: string, availabilityId: string) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    const row = await this.availabilityRepo.findOne({ where: { id: availabilityId, trainerId } });
    if (!row) throw new NotFoundException('Müsaitlik kaydı bulunamadı');
    await this.availabilityRepo.remove(row);
    return { ok: true as const };
  }

  /** Eğitmenin belirli tarihteki tüm müsaitliklerini sil */
  async clearTrainerDay(tenantId: string, trainerId: string, date: string) {
    const trainer = await this.trainersRepo.findOne({ where: { id: trainerId, tenantId } });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    await this.availabilityRepo.delete({ trainerId, date });
    return { ok: true as const };
  }

  // ─── Masöz Ajanda Yönetimi ───────────────────────────────────────────────────

  /** Masözün çalışma saatlerini getir */
  async getTherapistSchedule(tenantId: string, therapistId: string) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');
    return {
      id: therapist.id,
      name: therapist.name,
      workingHours: therapist.workingHours,
      active: therapist.active,
    };
  }

  /** Masözün çalışma saatlerini güncelle */
  async updateTherapistSchedule(
    tenantId: string,
    therapistId: string,
    workingHours: Record<string, string>,
  ) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');
    therapist.workingHours = workingHours;
    await this.spaTherapistsRepo.save(therapist);
    return { ok: true as const };
  }

  /** Tüm masözlerin çalışma saatlerini getir */
  async listTherapistSchedules(tenantId: string) {
    const therapists = await this.spaTherapistsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
    return therapists.map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      photoUrl: t.photoUrl,
      workingHours: t.workingHours,
      active: t.active,
      specialties: t.specialties,
    }));
  }

  // ─── Masöz Takvim Yönetimi (Eğitmenlerle aynı mantık) ────────────────────────

  /** Tüm aktif masözlerin belirli tarih aralığı için ajanda verisi */
  async listAllTherapistsAgenda(tenantId: string, from: string, to: string) {
    const therapists = await this.spaTherapistsRepo.find({
      where: { tenantId, active: true },
      order: { name: 'ASC' },
    });

    const allSlots = await this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.spaTherapistId IN (:...ids)', { ids: therapists.map((t) => t.id) })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .orderBy('a.date', 'ASC')
      .addOrderBy('a.startTime', 'ASC')
      .getMany();

    const allReservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.spaTherapistId IN (:...ids)', { ids: therapists.map((t) => t.id) })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :fromTs', { fromTs: new Date(`${from}T00:00:00`) })
      .andWhere('r.startTime <= :toTs', { toTs: new Date(`${to}T23:59:59`) })
      .getMany();

    return therapists.map((therapist) => {
      const slots = allSlots.filter((s) => s.spaTherapistId === therapist.id);
      const reservations = allReservations.filter((r) => r.spaTherapistId === therapist.id);

      return {
        therapistId: therapist.id,
        therapistName: therapist.name,
        photoUrl: therapist.photoUrl,
        slots: slots.map((slot) => {
          const dateStr =
            typeof slot.date === 'string'
              ? slot.date.slice(0, 10)
              : new Date(slot.date).toISOString().slice(0, 10);
          const slotStart = new Date(`${dateStr}T${slot.startTime}`);
          const slotEnd = new Date(`${dateStr}T${slot.endTime}`);
          const reservation = reservations.find(
            (r) => r.startTime >= slotStart && r.startTime < slotEnd,
          );
          return {
            id: slot.id,
            date: dateStr,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            available: slot.available,
            booked: !!reservation,
            reservation: reservation
              ? {
                  id: reservation.id,
                  memberName: reservation.user
                    ? `${reservation.user.firstName} ${reservation.user.lastName}`
                    : null,
                  status: reservation.status,
                }
              : null,
          };
        }),
      };
    });
  }

  async listTherapistCalendar(tenantId: string, therapistId: string, from: string, to: string) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');

    const rows = await this.availabilityRepo.find({
      where: { spaTherapistId: therapistId, date: Between(from, to) },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    // Bu tarih aralığındaki spa booking'leri getir
    const bookings = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.spaTherapistId = :therapistId', { therapistId })
      .andWhere('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from', { from: new Date(`${from}T00:00:00Z`) })
      .andWhere('r.startTime < :to', { to: new Date(`${to}T23:59:59Z`) })
      .getMany();

    return rows.map((row) => {
      const dateStr =
        typeof row.date === 'string'
          ? row.date.slice(0, 10)
          : new Date(row.date).toISOString().slice(0, 10);
      const slotStart = new Date(`${dateStr}T${row.startTime}Z`);
      const slotEnd = new Date(`${dateStr}T${row.endTime}Z`);
      const booking = bookings.find((b) => b.startTime >= slotStart && b.startTime < slotEnd);
      return {
        id: row.id,
        spaTherapistId: row.spaTherapistId,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        available: row.available,
        booked: !!booking,
        bookedBy: booking
          ? {
              reservationId: booking.id,
              firstName: booking.user?.firstName,
              lastName: booking.user?.lastName,
              phone: booking.user?.phone,
              status: booking.status,
            }
          : null,
      };
    });
  }

  async addTherapistAvailability(
    tenantId: string,
    therapistId: string,
    data: { date: string; startTime: string; endTime: string },
  ) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');
    const row = this.availabilityRepo.create({
      spaTherapistId: therapistId,
      trainerId: null,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      available: true,
    });
    return this.availabilityRepo.save(row);
  }

  async deleteTherapistAvailability(tenantId: string, therapistId: string, availabilityId: string) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');
    const row = await this.availabilityRepo.findOne({
      where: { id: availabilityId, spaTherapistId: therapistId },
    });
    if (!row) throw new NotFoundException('Müsaitlik kaydı bulunamadı');
    await this.availabilityRepo.remove(row);
    return { ok: true as const };
  }

  async bulkAddTherapistAvailability(
    tenantId: string,
    therapistId: string,
    data: {
      startDate: string;
      endDate: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const rows: Availability[] = [];
    const current = new Date(start);
    while (current <= end) {
      if (data.weekdays.includes(current.getDay())) {
        rows.push(
          this.availabilityRepo.create({
            spaTherapistId: therapistId,
            trainerId: null,
            date: current.toISOString().slice(0, 10),
            startTime: data.startTime,
            endTime: data.endTime,
            available: true,
          }),
        );
      }
      current.setDate(current.getDate() + 1);
    }
    if (rows.length === 0) return { created: 0 };
    await this.availabilityRepo.save(rows);
    return { created: rows.length };
  }

  async clearTherapistDay(tenantId: string, therapistId: string, date: string) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');
    await this.availabilityRepo.delete({ spaTherapistId: therapistId, date });
    return { ok: true as const };
  }

  // ─── Masöz Rezervasyon Yönetimi ──────────────────────────────────────────────

  /**
   * Masaj hizmet kataloğunu döner (admin rezervasyon modalı için).
   * Masöz belirtilirse, masözün uzmanlık alanlarıyla filtrelenir.
   */
  async listSpaServicesForBooking(tenantId: string, therapistId?: string) {
    const services = await this.spaServicesRepo.find({
      where: { tenantId, active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    if (!therapistId) {
      return services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        durationMinutes: s.durationMinutes,
        price: s.price,
        currency: s.currency,
      }));
    }
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: therapistId, tenantId },
    });
    // Masöz bulunamadıysa tümünü dön; uzmanlık tanımlıysa filtrele
    const specialties = therapist?.specialties ?? [];
    const filtered =
      specialties.length > 0
        ? services.filter((s) => {
            const lc = (x: string) => x.toLocaleLowerCase('tr-TR');
            return specialties.some((sp) => lc(sp) === lc(s.name) || lc(sp) === lc(s.category));
          })
        : services;
    // Filtre boş gelirse fallback olarak tümünü dön (yeni masöz, uzmanlık girilmemiş olabilir)
    const out = filtered.length > 0 ? filtered : services;
    return out.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      durationMinutes: s.durationMinutes,
      price: s.price,
      currency: s.currency,
    }));
  }

  async createTherapistReservationByAdmin(
    tenantId: string,
    data: {
      therapistId: string;
      userId: string;
      date: string;
      startTime: string;
      endTime?: string;
      serviceId?: string;
      notes?: string | null;
    },
  ) {
    const therapist = await this.spaTherapistsRepo.findOne({
      where: { id: data.therapistId, tenantId },
    });
    if (!therapist) throw new NotFoundException('Masöz bulunamadı');

    const member = await this.usersRepo.findOne({
      where: { id: data.userId, tenantId, role: UserRole.MEMBER },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    // Hizmet seçildiyse doğrula ve süreye göre bitişi otomatik hesapla
    let service: SpaService | null = null;
    if (data.serviceId) {
      service = await this.spaServicesRepo.findOne({
        where: { id: data.serviceId, tenantId, active: true },
      });
      if (!service) throw new NotFoundException('Masaj hizmeti bulunamadı');
    }

    const startDateTime = new Date(`${data.date}T${data.startTime}Z`);
    const endDateTime = service
      ? new Date(startDateTime.getTime() + service.durationMinutes * 60_000)
      : new Date(`${data.date}T${data.endTime ?? data.startTime}Z`);
    if (!service && !data.endTime) {
      throw new BadRequestException('Bitiş saati veya masaj hizmeti seçimi zorunlu');
    }
    if (endDateTime <= startDateTime) {
      throw new BadRequestException('Bitiş saati başlangıçtan sonra olmalı');
    }

    // Çakışma kontrolü: aynı masözün aynı zaman aralığında aktif başka rezervasyonu var mı?
    const conflict = await this.reservationsRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.spaTherapistId = :therapistId', { therapistId: data.therapistId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime < :end AND r.endTime > :start', {
        start: startDateTime,
        end: endDateTime,
      })
      .getOne();
    if (conflict) {
      throw new BadRequestException('Bu zaman aralığında masözün başka bir randevusu var');
    }

    const reservation = this.reservationsRepo.create({
      userId: data.userId,
      trainerId: null as never,
      spaTherapistId: data.therapistId,
      spaServiceId: service?.id ?? null,
      tenantId,
      sessionType: SessionType.MASSAGE,
      startTime: startDateTime,
      endTime: endDateTime,
      status: ReservationStatus.CONFIRMED,
      notes: data.notes?.trim()
        ? service
          ? `${data.notes.trim()} | Masöz: ${therapist.name} - Hizmet: ${service.name}`
          : `${data.notes.trim()} | Masöz: ${therapist.name}`
        : service
          ? `Admin tarafından oluşturuldu - Masöz: ${therapist.name} - Hizmet: ${service.name}`
          : `Admin tarafından oluşturuldu - Masöz: ${therapist.name}`,
      timeSlotId: null as never,
      packageId: null as never,
    });
    await this.reservationsRepo.save(reservation);

    const dateStr = startDateTime.toLocaleDateString('tr-TR');
    const timeStr = data.startTime.slice(0, 5);
    void this.notifier
      .reservationCreatedForMember({
        member,
        trainerName: service ? `${therapist.name} · ${service.name}` : therapist.name,
        date: dateStr,
        time: timeStr,
        sessionType: 'massage',
        reservationId: reservation.id,
      })
      .catch(() => {});

    return { ok: true as const, reservationId: reservation.id };
  }

  async rescheduleTherapistReservation(
    tenantId: string,
    reservationId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    therapistId?: string,
  ) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException('Bu rezervasyon taşınamaz');
    }

    const newStart = new Date(`${newDate}T${newStartTime}Z`);
    const newEnd = new Date(`${newDate}T${newEndTime}Z`);

    if (therapistId) {
      const existing = await this.availabilityRepo.findOne({
        where: { spaTherapistId: therapistId, date: newDate, startTime: newStartTime },
      });
      if (!existing) {
        const newAv = this.availabilityRepo.create({
          spaTherapistId: therapistId,
          trainerId: null,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          available: true,
        });
        await this.availabilityRepo.save(newAv);
      }
      // Masöz değişiyorsa güncelle
      if (therapistId !== reservation.spaTherapistId) {
        reservation.spaTherapistId = therapistId;
      }
    }

    reservation.startTime = newStart;
    reservation.endTime = newEnd;
    await this.reservationsRepo.save(reservation);

    if (reservation.user) {
      void this.notifier
        .reservationRescheduledForMember({
          member: reservation.user,
          trainerName: '',
          newDate: newStart.toLocaleDateString('tr-TR'),
          newTime: newStartTime.slice(0, 5),
          reservationId,
        })
        .catch(() => {});
    }

    return { ok: true as const };
  }

  // ─── Birleşik Ajanda (Günlük Matris) ─────────────────────────────────────────

  /**
   * Hızlı üye oluşturma — walk-in için. Sadece ad/soyad + telefon alır,
   * email opsiyonel (boşsa deterministik placeholder üretilir).
   */
  async quickCreateMember(
    tenantId: string,
    data: { firstName: string; lastName: string; phone?: string | null; email?: string | null },
  ) {
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Ad ve soyad zorunlu');
    }

    const phone = (data.phone || '').trim() || null;
    let email = (data.email || '').trim().toLowerCase();
    if (!email) {
      const slugBase = phone
        ? phone.replace(/\D+/g, '')
        : `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '');
      email = `${slugBase || 'walkin'}-${Date.now().toString(36)}@walkin.local`;
    }

    const existing = await this.usersRepo.findOne({ where: { tenantId, email } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor');
    }

    const tempPassword = `WI-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const username = email.split('@')[0];

    const user = this.usersRepo.create({
      tenantId,
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: UserRole.MEMBER,
      accountStatus: MemberAccountStatus.ACTIVE,
    });
    await this.usersRepo.save(user);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };
  }

  /**
   * Seçilen tüm eğitmen/masözlere belirtilen tarih aralığında belirli haftanın günlerinde
   * saat aralığını 1 saatlik slotlar olarak açar. Idempotent.
   */
  async bulkOpenAvailability(
    tenantId: string,
    data: {
      trainerIds?: string[];
      therapistIds?: string[];
      startDate: string;
      endDate: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    const trainerIds = data.trainerIds ?? [];
    const therapistIds = data.therapistIds ?? [];
    if (trainerIds.length === 0 && therapistIds.length === 0) {
      throw new BadRequestException('En az bir eğitmen veya masöz seçilmeli');
    }

    if (trainerIds.length > 0) {
      const foundTrainers = await this.trainersRepo.find({
        where: trainerIds.map((id) => ({ id, tenantId })),
      });
      if (foundTrainers.length !== trainerIds.length) {
        throw new BadRequestException('Geçersiz eğitmen id');
      }
    }
    if (therapistIds.length > 0) {
      const foundTherapists = await this.spaTherapistsRepo.find({
        where: therapistIds.map((id) => ({ id, tenantId })),
      });
      if (foundTherapists.length !== therapistIds.length) {
        throw new BadRequestException('Geçersiz masöz id');
      }
    }

    const startH = parseInt(data.startTime.split(':')[0], 10);
    const endH = parseInt(data.endTime.split(':')[0], 10);
    if (!(startH < endH)) {
      throw new BadRequestException('Bitiş saati başlangıçtan büyük olmalı');
    }

    const rows: Availability[] = [];
    const start = new Date(`${data.startDate}T00:00:00Z`);
    const end = new Date(`${data.endDate}T00:00:00Z`);
    const current = new Date(start);
    while (current.getTime() <= end.getTime()) {
      if (data.weekdays.includes(current.getUTCDay())) {
        const dateStr = current.toISOString().slice(0, 10);
        for (let h = startH; h < endH; h += 1) {
          const ss = `${h.toString().padStart(2, '0')}:00`;
          const se = `${(h + 1).toString().padStart(2, '0')}:00`;
          for (const tId of trainerIds) {
            rows.push(
              this.availabilityRepo.create({
                trainerId: tId,
                spaTherapistId: null,
                date: dateStr,
                startTime: ss,
                endTime: se,
                available: true,
              }),
            );
          }
          for (const sId of therapistIds) {
            rows.push(
              this.availabilityRepo.create({
                trainerId: null,
                spaTherapistId: sId,
                date: dateStr,
                startTime: ss,
                endTime: se,
                available: true,
              }),
            );
          }
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (rows.length === 0) return { created: 0 };

    const dates = Array.from(new Set(rows.map((r) => r.date)));
    const qb = this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.date IN (:...dates)', { dates });
    if (trainerIds.length > 0 && therapistIds.length > 0) {
      qb.andWhere('(a.trainerId IN (:...trainers) OR a.spaTherapistId IN (:...therapists))', {
        trainers: trainerIds,
        therapists: therapistIds,
      });
    } else if (trainerIds.length > 0) {
      qb.andWhere('a.trainerId IN (:...trainers)', { trainers: trainerIds });
    } else {
      qb.andWhere('a.spaTherapistId IN (:...therapists)', { therapists: therapistIds });
    }
    const existingRows = await qb.getMany();
    const existingKeys = new Set(
      existingRows.map(
        (a) => `${a.trainerId ?? 'T:' + a.spaTherapistId}|${a.date}|${a.startTime.slice(0, 5)}`,
      ),
    );
    const toInsert = rows.filter((r) => {
      const key = `${r.trainerId ?? 'T:' + r.spaTherapistId}|${r.date}|${r.startTime.slice(0, 5)}`;
      return !existingKeys.has(key);
    });
    if (toInsert.length === 0) return { created: 0 };
    await this.availabilityRepo.save(toInsert);
    return { created: toInsert.length };
  }

  /**
   * Günlük eğitmen matrisi: Tek bir tarih için tüm eğitmenlerin saat bazında durumu.
   * Her hücre: { state: 'available' | 'booked', bookedBy?: {...}, availabilityId?, reservationId? }
   */
  async listDailyTrainerGrid(tenantId: string, date: string) {
    const trainers = await this.trainersRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    if (trainers.length === 0) {
      return { date, resources: [], grid: {} as Record<string, Record<string, unknown>> };
    }

    const trainerIds = trainers.map((t) => t.id);
    const availabilities = await this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.trainerId IN (:...ids)', { ids: trainerIds })
      .andWhere('a.date = :date', { date })
      .getMany();

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const reservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.trainerId IN (:...ids)', { ids: trainerIds })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from AND r.startTime < :to', { from: dayStart, to: dayEnd })
      .getMany();

    const grid: Record<string, Record<string, unknown>> = {};
    for (const t of trainers) grid[t.id] = {};
    for (const a of availabilities) {
      const key = a.startTime.slice(0, 5);
      if (!a.trainerId || !grid[a.trainerId]) continue;
      grid[a.trainerId][key] = {
        state: 'available',
        availabilityId: a.id,
        endTime: a.endTime.slice(0, 5),
      };
    }
    for (const r of reservations) {
      if (!r.trainerId) continue;
      const key = new Date(r.startTime).toISOString().slice(11, 16);
      grid[r.trainerId][key] = {
        state: 'booked',
        reservationId: r.id,
        endTime: new Date(r.endTime).toISOString().slice(11, 16),
        bookedBy: r.user
          ? {
              firstName: r.user.firstName,
              lastName: r.user.lastName,
              phone: r.user.phone,
              status: r.status,
            }
          : null,
      };
    }

    return {
      date,
      resources: trainers.map((t) => ({
        id: t.id,
        kind: 'trainer' as const,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        photoUrl: t.photoUrl,
      })),
      grid,
    };
  }

  /**
   * Günlük masöz matrisi: Tek bir tarih için tüm masözlerin saat bazında durumu.
   */
  async listDailyTherapistGrid(tenantId: string, date: string) {
    const therapists = await this.spaTherapistsRepo.find({
      where: { tenantId, active: true },
      order: { name: 'ASC' },
    });
    if (therapists.length === 0) {
      return { date, resources: [], grid: {} as Record<string, Record<string, unknown>> };
    }

    const ids = therapists.map((t) => t.id);
    const availabilities = await this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.spaTherapistId IN (:...ids)', { ids })
      .andWhere('a.date = :date', { date })
      .getMany();

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const reservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.spaService', 's')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.spaTherapistId IN (:...ids)', { ids })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from AND r.startTime < :to', { from: dayStart, to: dayEnd })
      .getMany();

    const grid: Record<string, Record<string, unknown>> = {};
    for (const t of therapists) grid[t.id] = {};
    for (const a of availabilities) {
      const key = a.startTime.slice(0, 5);
      if (!a.spaTherapistId || !grid[a.spaTherapistId]) continue;
      grid[a.spaTherapistId][key] = {
        state: 'available',
        availabilityId: a.id,
        endTime: a.endTime.slice(0, 5),
      };
    }
    for (const r of reservations) {
      if (!r.spaTherapistId) continue;
      const key = new Date(r.startTime).toISOString().slice(11, 16);
      grid[r.spaTherapistId][key] = {
        state: 'booked',
        reservationId: r.id,
        endTime: new Date(r.endTime).toISOString().slice(11, 16),
        serviceName: r.spaService?.name ?? null,
        bookedBy: r.user
          ? {
              firstName: r.user.firstName,
              lastName: r.user.lastName,
              phone: r.user.phone,
              status: r.status,
            }
          : null,
      };
    }

    return {
      date,
      resources: therapists.map((t) => ({
        id: t.id,
        kind: 'therapist' as const,
        name: t.name,
        photoUrl: t.photoUrl,
        specialties: t.specialties,
      })),
      grid,
    };
  }

  /**
   * Günlük özet KPI: bugün toplam/müsait/dolu slot, doluluk oranı, kaynak sayısı.
   */
  async getDailyScheduleSummary(tenantId: string, date: string) {
    const [trainerGrid, therapistGrid] = await Promise.all([
      this.listDailyTrainerGrid(tenantId, date),
      this.listDailyTherapistGrid(tenantId, date),
    ]);

    const summarize = (g: {
      resources: { id: string }[];
      grid: Record<string, Record<string, unknown>>;
    }) => {
      let available = 0;
      let booked = 0;
      for (const r of g.resources) {
        const cells = g.grid[r.id] ?? {};
        for (const cell of Object.values(cells)) {
          const state = (cell as { state?: string })?.state;
          if (state === 'available') available += 1;
          else if (state === 'booked') booked += 1;
        }
      }
      const total = available + booked;
      return { resourceCount: g.resources.length, available, booked, total };
    };

    const trainerSummary = summarize(trainerGrid);
    const therapistSummary = summarize(therapistGrid);
    const grandTotal = trainerSummary.total + therapistSummary.total;
    const grandBooked = trainerSummary.booked + therapistSummary.booked;
    return {
      date,
      trainers: trainerSummary,
      therapists: therapistSummary,
      total: grandTotal,
      totalBooked: grandBooked,
      occupancyRate: grandTotal === 0 ? 0 : Math.round((grandBooked / grandTotal) * 100),
    };
  }

  // ─── Eğitmen Başvuruları (Kulüp Admin) ──────────────────────────────────────

  /** Kulüp davet kodunu getir (yoksa oluştur) */
  async getClubInviteCode(tenantId: string) {
    const tenantRepo = this.usersRepo.manager.getRepository('Tenant');
    const tenant = (await tenantRepo.findOne({ where: { id: tenantId } })) as {
      id: string;
      inviteCode: string | null;
    } | null;
    if (!tenant) throw new NotFoundException('Kulüp bulunamadı');

    if (!tenant.inviteCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      await tenantRepo.update({ id: tenantId }, { inviteCode: code });
      return { inviteCode: code };
    }
    return { inviteCode: tenant.inviteCode };
  }

  /** Kulübe başvuran eğitmenleri listele (preferredClubSubdomain eşleşen) */
  async listTrainerApplications(tenantId: string) {
    // Kulübün subdomain'ini bul
    const tenant = (await this.usersRepo.manager
      .getRepository('Tenant')
      .findOne({ where: { id: tenantId } })) as { subdomain: string } | null;
    if (!tenant) return [];

    const apps = await this.trainerApplicationsRepo.find({
      where: { preferredClubSubdomain: tenant.subdomain },
      relations: ['user', 'trainer'],
      order: { createdAt: 'DESC' },
    });

    return apps.map((app) => ({
      id: app.id,
      status: app.status,
      createdAt: app.createdAt,
      reviewedAt: app.reviewedAt,
      adminNote: app.adminNote,
      user: {
        id: app.user.id,
        firstName: app.user.firstName,
        lastName: app.user.lastName,
        email: app.user.email,
        phone: app.user.phone,
        photoUrl: app.user.photoUrl,
      },
      trainer: app.trainer
        ? {
            id: app.trainer.id,
            bio: app.trainer.bio,
            specializations: app.trainer.specializations,
            offersSessionTypes: app.trainer.offersSessionTypes,
          }
        : null,
    }));
  }

  /** Eğitmen başvurusunu onayla — kulüp admin */
  async approveTrainerApplication(admin: User, applicationId: string, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({
      where: { id: applicationId },
      relations: ['user', 'trainer'],
    });
    if (!app) throw new NotFoundException('Başvuru bulunamadı');
    if (app.status !== 'pending') throw new BadRequestException('Bu başvuru zaten işlenmiş');

    // Verify this club admin has authority (preferredClubSubdomain matches)
    const tenant = (await this.usersRepo.manager
      .getRepository('Tenant')
      .findOne({ where: { id: admin.tenantId } })) as { subdomain: string } | null;
    if (!tenant || app.preferredClubSubdomain !== tenant.subdomain) {
      throw new BadRequestException('Bu başvuru sizin kulübünüze ait değil');
    }

    // Approve
    app.status = 'approved';
    app.adminNote = note?.trim() || null;
    app.reviewedByUserId = admin.id;
    app.reviewedAt = new Date();
    await this.trainerApplicationsRepo.save(app);

    // Activate user
    await this.usersRepo.update({ id: app.userId }, { accountStatus: MemberAccountStatus.ACTIVE });

    // Move trainer to this club's tenant
    await this.trainersRepo.update({ id: app.trainerId }, { tenantId: admin.tenantId });

    // Notify trainer
    void this.notifier
      .memberApproved({
        ...app.user,
        tenantId: admin.tenantId,
      })
      .catch(() => {});

    return { ok: true };
  }

  /** Eğitmen başvurusunu reddet — kulüp admin */
  async rejectTrainerApplication(admin: User, applicationId: string, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Başvuru bulunamadı');
    if (app.status !== 'pending') throw new BadRequestException('Bu başvuru zaten işlenmiş');

    app.status = 'rejected';
    app.adminNote = note?.trim() || null;
    app.reviewedByUserId = admin.id;
    app.reviewedAt = new Date();
    await this.trainerApplicationsRepo.save(app);

    // Update user status
    await this.usersRepo.update(
      { id: app.userId },
      { accountStatus: MemberAccountStatus.REJECTED },
    );

    return { ok: true };
  }

  // ─── Kulüp Profil Yönetimi ────────────────────────────────────────────────────

  /** Admin: Kulüp profil bilgilerini getir */
  async getTenantProfile(tenantId: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      description: tenant.description,
      location: tenant.location,
      logoUrl: tenant.logoUrl,
      coverImageUrl: tenant.coverImageUrl,
      galleryImages: tenant.galleryImages ?? [],
      services: tenant.services ?? [],
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      priceRange: tenant.priceRange,
      visibilityMode: tenant.visibilityMode,
      vertical: tenant.vertical,
    };
  }

  /** Admin: Kulüp profil bilgilerini güncelle */
  async updateTenantProfile(
    tenantId: string,
    data: {
      description?: string;
      location?: string;
      services?: string[];
      logoUrl?: string;
      coverImageUrl?: string;
      galleryImages?: string[];
      phone?: string;
      email?: string;
      website?: string;
      priceRange?: string;
    },
  ) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    if (data.description !== undefined) tenant.description = data.description?.trim() || null;
    if (data.location !== undefined) tenant.location = data.location?.trim() || null;
    if (data.services !== undefined) tenant.services = data.services;
    if (data.logoUrl !== undefined) tenant.logoUrl = data.logoUrl?.trim() || null;
    if (data.coverImageUrl !== undefined) tenant.coverImageUrl = data.coverImageUrl?.trim() || null;
    if (data.galleryImages !== undefined) tenant.galleryImages = data.galleryImages;
    if (data.phone !== undefined) tenant.phone = data.phone?.trim() || null;
    if (data.email !== undefined) tenant.email = data.email?.trim() || null;
    if (data.website !== undefined) tenant.website = data.website?.trim() || null;
    if (data.priceRange !== undefined) tenant.priceRange = data.priceRange?.trim() || null;

    await this.tenantsRepo.save(tenant);
    return { ok: true };
  }

  // ─── Push Bildirim ────────────────────────────────────────────────────────────

  /** Kulüp admin: toplu push bildirim gönder */
  async sendPushNotification(
    tenantId: string,
    data: {
      title: string;
      message: string;
      imageUrl?: string;
      target: 'members' | 'trainers' | 'all';
      eventId?: string;
    },
  ) {
    if (!data.title?.trim() || !data.message?.trim()) {
      throw new BadRequestException('Başlık ve mesaj zorunludur');
    }

    const targetRole =
      data.target === 'members'
        ? ('member' as const)
        : data.target === 'trainers'
          ? ('trainer' as const)
          : ('all' as const);

    const result = await this.pushService.sendToTenantMembers(
      tenantId,
      data.title.trim(),
      data.message.trim(),
      {
        type: data.eventId ? 'event_announcement' : 'custom_notification',
        eventId: data.eventId ?? undefined,
        imageUrl: data.imageUrl?.trim() ?? undefined,
      },
      data.imageUrl?.trim() ?? null,
      targetRole,
    );

    return {
      ok: true,
      sent: result.sent,
      total: result.total,
      target: data.target,
    };
  }

  // ─── Yeni Üye Yönetimi Endpoint'leri ──────────────────────────────────────────

  /** Admin: Üye şifresini sıfırla (yeni şifre oluştur) */
  async resetMemberPassword(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    const newPassword = `Temp${Date.now().toString(36).slice(-4)}!`;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update(
      { id: userId },
      { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    );

    return { ok: true, temporaryPassword: newPassword, email: user.email };
  }

  /** Admin: Üye profilini güncelle */
  async updateMemberProfile(
    tenantId: string,
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string | null; email?: string },
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    if (data.firstName !== undefined) user.firstName = data.firstName.trim();
    if (data.lastName !== undefined) user.lastName = data.lastName.trim();
    if (data.phone !== undefined) user.phone = data.phone?.trim() || null;
    if (data.email !== undefined && data.email.trim()) {
      user.email = data.email.trim().toLowerCase();
    }

    await this.usersRepo.save(user);
    return {
      ok: true,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };
  }

  /** Admin: Üyeyi kalıcı olarak sil (KVKK uyumu) */
  async deleteMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    await this.usersRepo.remove(user);
    return { ok: true, deletedUserId: userId };
  }

  /** Admin: Üyeye eğitmen ata (trainer_member_link oluştur) */
  async assignTrainerToMember(tenantId: string, userId: string, trainerId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId, tenantId },
      relations: ['user'],
    });
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');

    // Mevcut bağlantı var mı?
    const existing = await this.trainerMemberLinksRepo.findOne({
      where: { trainerId, memberUserId: userId },
    });

    if (existing) {
      if (existing.status !== 'active') {
        existing.status = 'active';
        await this.trainerMemberLinksRepo.save(existing);
      }
      return {
        ok: true,
        linkId: existing.id,
        trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
        status: 'active',
      };
    }

    const link = this.trainerMemberLinksRepo.create({
      tenantId,
      trainerId,
      memberUserId: userId,
      status: 'active',
    });
    await this.trainerMemberLinksRepo.save(link);

    return {
      ok: true,
      linkId: link.id,
      trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
      status: 'active',
    };
  }

  /** Admin: Üyeden eğitmen atamasını kaldır */
  async removeTrainerFromMember(tenantId: string, userId: string, trainerId: string) {
    const link = await this.trainerMemberLinksRepo.findOne({
      where: { trainerId, memberUserId: userId, tenantId },
    });
    if (!link) throw new NotFoundException('Atama bulunamadı');

    await this.trainerMemberLinksRepo.remove(link);
    return { ok: true, removedTrainerId: trainerId };
  }

  /** Admin: Üye hesabını dondur/askıya al */
  async suspendMember(tenantId: string, userId: string, reason?: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    await this.usersRepo.update(
      { id: userId },
      { accountStatus: 'suspended' as MemberAccountStatus },
    );

    // Aktif paketlerin süresini dondur (expiresAt'ı ileriye al)
    const activePackages = await this.packagesRepo.find({
      where: { userId, status: 'active' as never },
    });
    for (const pkg of activePackages) {
      // Paket notuna dondurma tarihi ekle
      await this.packagesRepo.update(
        { id: pkg.id },
        {
          status: 'frozen' as never,
        },
      );
    }

    return {
      ok: true,
      reason: reason || 'Hesap askıya alındı',
      frozenPackages: activePackages.length,
    };
  }

  /** Admin: Üye hesabını aktifleştir (dondurma kaldır) */
  async reactivateMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    await this.usersRepo.update({ id: userId }, { accountStatus: MemberAccountStatus.ACTIVE });

    // Donmuş paketleri tekrar aktif yap
    const frozenPackages = await this.packagesRepo.find({
      where: { userId, status: 'frozen' as never },
    });
    for (const pkg of frozenPackages) {
      // Süreyi uzat: dondurma süresini ekle (basit: 30 gün ekle)
      const newExpiry = new Date(pkg.expiresAt);
      newExpiry.setDate(newExpiry.getDate() + 30);
      await this.packagesRepo.update(
        { id: pkg.id },
        {
          status: 'active' as never,
          expiresAt: newExpiry.toISOString().slice(0, 10),
        },
      );
    }

    return { ok: true, reactivatedPackages: frozenPackages.length };
  }

  /** Admin: Üye notu ekle */
  async addMemberNote(tenantId: string, userId: string, note: string, adminId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    // emergencyContact alanını notes olarak kullanıyoruz (JSON)
    const existing =
      (user.emergencyContact as {
        notes?: Array<{ text: string; date: string; adminId: string }>;
      } | null) || {};
    const notes = existing.notes || [];
    notes.unshift({ text: note.trim(), date: new Date().toISOString(), adminId });

    await this.usersRepo.update(
      { id: userId },
      {
        emergencyContact: { ...existing, notes },
      },
    );

    return { ok: true, totalNotes: notes.length };
  }

  /** Admin: Üye notlarını getir */
  async getMemberNotes(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    const data =
      (user.emergencyContact as {
        notes?: Array<{ text: string; date: string; adminId: string }>;
      } | null) || {};
    return data.notes || [];
  }

  /** Admin: Üye notunu güncelle */
  async updateMemberNote(tenantId: string, userId: string, index: number, text: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    const data =
      (user.emergencyContact as {
        notes?: Array<{ text: string; date: string; adminId: string }>;
      } | null) || {};
    const notes = data.notes || [];
    if (index < 0 || index >= notes.length) throw new BadRequestException('Geçersiz not index');

    notes[index].text = text.trim();
    await this.usersRepo.update({ id: userId }, { emergencyContact: { ...data, notes } as never });
    return { ok: true };
  }

  /** Admin: Üye notunu sil */
  async deleteMemberNote(tenantId: string, userId: string, index: number) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    const data =
      (user.emergencyContact as {
        notes?: Array<{ text: string; date: string; adminId: string }>;
      } | null) || {};
    const notes = data.notes || [];
    if (index < 0 || index >= notes.length) throw new BadRequestException('Geçersiz not index');

    notes.splice(index, 1);
    await this.usersRepo.update({ id: userId }, { emergencyContact: { ...data, notes } as never });
    return { ok: true };
  }

  /** Admin: Paket süresini uzat */
  async extendPackageExpiry(
    tenantId: string,
    userId: string,
    packageId: string,
    extraDays: number,
  ) {
    const pkg = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoin('p.packageType', 'pt')
      .where('p.id = :id', { id: packageId })
      .andWhere('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!pkg) throw new NotFoundException('Paket bulunamadı');

    const currentExpiry = new Date(pkg.expiresAt);
    currentExpiry.setDate(currentExpiry.getDate() + extraDays);
    const newExpiresAt = currentExpiry.toISOString().slice(0, 10);

    await this.packagesRepo.update({ id: packageId }, { expiresAt: newExpiresAt });

    return { ok: true, packageId, previousExpiry: pkg.expiresAt, newExpiry: newExpiresAt };
  }

  /** Admin: Toplu üye ekleme (CSV data) */
  async bulkCreateMembers(
    tenantId: string,
    members: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>,
  ) {
    const results: Array<{ email: string; status: 'created' | 'exists' | 'error'; id?: string }> =
      [];

    for (const m of members) {
      try {
        const result = await this.quickCreateMember(tenantId, {
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email || null,
          phone: m.phone || null,
        });
        results.push({ email: result.email, status: 'created', id: result.id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        results.push({
          email: m.email || `${m.firstName} ${m.lastName}`,
          status: msg.includes('zaten') ? 'exists' : 'error',
        });
      }
    }

    return {
      total: members.length,
      created: results.filter((r) => r.status === 'created').length,
      exists: results.filter((r) => r.status === 'exists').length,
      errors: results.filter((r) => r.status === 'error').length,
      details: results,
    };
  }

  /** Admin: Üyelik oluştur veya güncelle */
  async setMembership(
    tenantId: string,
    userId: string,
    data: { membershipType: string; startDate: string; endDate: string; price?: number },
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Üye bulunamadı');

    let membership = await this.membershipsRepo.findOne({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
    });

    if (membership) {
      membership.membershipType = data.membershipType;
      membership.startDate = data.startDate;
      membership.endDate = data.endDate;
      membership.status = 'active';
      if (data.price !== undefined) membership.price = String(data.price);
      await this.membershipsRepo.save(membership);
    } else {
      membership = this.membershipsRepo.create({
        tenantId,
        userId,
        membershipType: data.membershipType,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'active',
        price: String(data.price ?? 0),
        currency: 'TRY',
      });
      await this.membershipsRepo.save(membership);
    }

    return {
      ok: true,
      membershipId: membership.id,
      startDate: membership.startDate,
      endDate: membership.endDate,
      membershipType: membership.membershipType,
    };
  }

  /** Admin: Mevcut pakete seans ekle (7 + 10 = 17) */
  async addSessionsToPackage(
    tenantId: string,
    userId: string,
    packageId: string,
    sessions: number,
  ) {
    if (sessions <= 0) throw new BadRequestException("Seans sayısı 0'dan büyük olmalı");

    const pkg = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoin('p.packageType', 'pt')
      .addSelect(['pt.tenantId', 'pt.name'])
      .where('p.id = :id', { id: packageId })
      .andWhere('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!pkg) throw new NotFoundException('Paket bulunamadı');

    const previousSessions = pkg.remainingSessions;
    pkg.remainingSessions += sessions;

    if (pkg.status === PackageStatus.DEPLETED || pkg.status === PackageStatus.EXPIRED) {
      pkg.status = PackageStatus.ACTIVE;
    }

    await this.packagesRepo.save(pkg);

    return {
      ok: true,
      packageId,
      previousSessions,
      addedSessions: sessions,
      newTotal: pkg.remainingSessions,
    };
  }

  /** Admin: Üyenin paketini sil */
  async deleteMemberPackage(tenantId: string, userId: string, packageId: string) {
    const pkg = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoin('p.packageType', 'pt')
      .where('p.id = :id', { id: packageId })
      .andWhere('p.userId = :userId', { userId })
      .andWhere('pt.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!pkg) throw new NotFoundException('Paket bulunamadı');

    await this.packagesRepo.remove(pkg);
    return { ok: true, deletedPackageId: packageId };
  }

  // ─── TOPLU İŞLEMLER ──────────────────────────────────────────────────────────

  /** Verilen ID'lere göre üyeleri getir (tenant güvenliği ile) */
  async getMembersByIds(tenantId: string, memberIds: string[]): Promise<User[]> {
    if (!memberIds.length) return [];
    return this.usersRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.id IN (:...ids)', { ids: memberIds })
      .andWhere('u.role = :role', { role: UserRole.MEMBER })
      .getMany();
  }

  /** Toplu paket atama */
  async bulkAssignPackage(
    tenantId: string,
    memberIds: string[],
    packageTypeId: string,
    trainerId?: string,
  ): Promise<{ assigned: number; failed: number }> {
    const pkgType = await this.packageTypesRepo.findOne({
      where: { id: packageTypeId, tenantId },
    });
    if (!pkgType) throw new NotFoundException('Paket tipi bulunamadı');

    const members = await this.getMembersByIds(tenantId, memberIds);
    let assigned = 0;
    let failed = 0;

    for (const member of members) {
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pkgType.validityDays);

        const pkg = this.packagesRepo.create({
          userId: member.id,
          packageTypeId: pkgType.id,
          remainingSessions: pkgType.sessionCount,
          status: PackageStatus.ACTIVE,
          expiresAt: expiresAt.toISOString().slice(0, 10),
          assignedTrainerId: trainerId || null,
        });
        await this.packagesRepo.save(pkg);
        assigned++;
      } catch {
        failed++;
      }
    }

    return { assigned, failed };
  }
}
