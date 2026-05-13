import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm';
import { Availability } from '../database/entities/availability.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { TrainerMemberNote } from '../database/entities/trainer-member-note.entity';
import { Package } from '../database/entities/package.entity';
import { User } from '../database/entities/user.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { ReservationStatus, SessionType, MemberAccountStatus, UserRole } from '../database/enums';
import { PushService } from '../notifications/push.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';

@Injectable()
export class TrainerPanelService {
  constructor(
    @InjectRepository(Availability) private readonly availRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TrainerProfile) private readonly profilesRepo: Repository<TrainerProfile>,
    @InjectRepository(TrainerMemberLink) private readonly linksRepo: Repository<TrainerMemberLink>,
    @InjectRepository(TrainerMemberNote) private readonly notesRepo: Repository<TrainerMemberNote>,
    @InjectRepository(Package) private readonly packagesRepo: Repository<Package>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    private readonly pushService: PushService,
    private readonly notifier: NotificationDispatcher,
  ) {}

  private async resolveTrainer(user: User): Promise<Trainer> {
    const trainer = await this.trainersRepo.findOne({ where: { userId: user.id } });
    if (!trainer) throw new NotFoundException('Trainer profile not found');
    return trainer;
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(user: User) {
    const trainer = await this.resolveTrainer(user);
    const now = new Date();
    const todayStart = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    const todayEnd = new Date(now.toISOString().slice(0, 10) + 'T23:59:59Z');
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      todayLessons,
      weeklyLessons,
      monthlyCompleted,
      monthlyCancelled,
      activeStudents,
      pendingRequests,
    ] = await Promise.all([
      this.resRepo.count({
        where: {
          trainerId: trainer.id,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
          startTime: Between(todayStart, todayEnd),
        },
      }),
      this.resRepo.count({
        where: {
          trainerId: trainer.id,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
          startTime: Between(weekStart, weekEnd),
        },
      }),
      this.resRepo.count({
        where: {
          trainerId: trainer.id,
          status: ReservationStatus.COMPLETED,
          startTime: Between(monthStart, monthEnd),
        },
      }),
      this.resRepo.count({
        where: {
          trainerId: trainer.id,
          status: ReservationStatus.CANCELLED,
          startTime: Between(monthStart, monthEnd),
        },
      }),
      this.linksRepo.count({ where: { trainerId: trainer.id, status: 'active' } }),
      this.resRepo.count({ where: { trainerId: trainer.id, status: ReservationStatus.PENDING } }),
    ]);

    // Next lesson
    const nextLesson = await this.resRepo.findOne({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: MoreThanOrEqual(now),
      },
      relations: ['user'],
      order: { startTime: 'ASC' },
    });

    // Today schedule
    const todaySchedule = await this.resRepo.find({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(todayStart, todayEnd),
      },
      relations: ['user'],
      order: { startTime: 'ASC' },
    });

    // Unread messages
    const conversations = await this.convRepo
      .createQueryBuilder('c')
      .where('c.participant_a_id = :uid OR c.participant_b_id = :uid', { uid: user.id })
      .getMany();
    const unreadMessages = conversations.reduce((sum, c) => {
      const isA = c.participantAId === user.id;
      return sum + (isA ? c.unreadCountA : c.unreadCountB);
    }, 0);

    return {
      todayLessons,
      weeklyLessons,
      monthlyCompleted,
      monthlyCancelled,
      activeStudents,
      pendingRequests,
      unreadMessages,
      nextLesson: nextLesson
        ? {
            time: nextLesson.startTime.toISOString(),
            studentName: `${nextLesson.user.firstName} ${nextLesson.user.lastName}`.trim(),
          }
        : null,
      todaySchedule: todaySchedule.map((r) => ({
        id: r.id,
        time: r.startTime.toISOString(),
        endTime: r.endTime.toISOString(),
        studentName: `${r.user.firstName} ${r.user.lastName}`.trim(),
        type: r.sessionType,
        status: r.status,
      })),
    };
  }

  // ─── Calendar ───────────────────────────────────────────────────────────────

  async getCalendar(user: User, from: string, to: string) {
    const trainer = await this.resolveTrainer(user);
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [availabilities, lessons] = await Promise.all([
      this.availRepo.find({
        where: { trainerId: trainer.id, date: Between(from.slice(0, 10), to.slice(0, 10)) },
        order: { date: 'ASC', startTime: 'ASC' },
      }),
      this.resRepo.find({
        where: {
          trainerId: trainer.id,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
          startTime: Between(fromDate, toDate),
        },
        relations: ['user'],
        order: { startTime: 'ASC' },
      }),
    ]);

    return {
      availabilities: availabilities.map((a) => ({
        id: a.id,
        date: typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().slice(0, 10),
        startTime: a.startTime,
        endTime: a.endTime,
        available: a.available,
      })),
      lessons: lessons.map((r) => ({
        id: r.id,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime.toISOString(),
        studentName: `${r.user.firstName} ${r.user.lastName}`.trim(),
        studentId: r.userId,
        type: r.sessionType,
        status: r.status,
      })),
    };
  }

  // ─── Availability Management ────────────────────────────────────────────────

  async createAvailability(user: User, data: { date: string; startTime: string; endTime: string }) {
    const trainer = await this.resolveTrainer(user);
    const avail = this.availRepo.create({
      trainerId: trainer.id,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      available: true,
    });
    await this.availRepo.save(avail);
    return { id: avail.id, date: data.date, startTime: data.startTime, endTime: data.endTime };
  }

  async createBulkAvailability(
    user: User,
    data: { startDate: string; weeks: number; days: number[]; startTime: string; endTime: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    const created: Array<{ id: string; date: string; startTime: string; endTime: string }> = [];
    const start = new Date(data.startDate + 'T12:00:00');

    for (let w = 0; w < data.weeks; w++) {
      for (const day of data.days) {
        const d = new Date(start);
        d.setDate(d.getDate() + w * 7 + ((day - start.getDay() + 7) % 7));
        const dateStr = d.toISOString().slice(0, 10);
        const avail = this.availRepo.create({
          trainerId: trainer.id,
          date: dateStr,
          startTime: data.startTime,
          endTime: data.endTime,
          available: true,
        });
        await this.availRepo.save(avail);
        created.push({
          id: avail.id,
          date: dateStr,
          startTime: data.startTime,
          endTime: data.endTime,
        });
      }
    }
    return { created: created.length, slots: created };
  }

  async updateAvailability(
    user: User,
    availId: string,
    data: { startTime?: string; endTime?: string; available?: boolean },
  ) {
    const trainer = await this.resolveTrainer(user);
    const avail = await this.availRepo.findOne({ where: { id: availId, trainerId: trainer.id } });
    if (!avail) throw new NotFoundException('Slot bulunamadı');
    if (data.startTime) avail.startTime = data.startTime;
    if (data.endTime) avail.endTime = data.endTime;
    if (data.available !== undefined) avail.available = data.available;
    await this.availRepo.save(avail);
    return { ok: true };
  }

  async deleteAvailability(user: User, availId: string) {
    const trainer = await this.resolveTrainer(user);
    const avail = await this.availRepo.findOne({ where: { id: availId, trainerId: trainer.id } });
    if (!avail) throw new NotFoundException('Slot bulunamadı');

    // Check if there's an active lesson in this slot
    const dateStr =
      typeof avail.date === 'string' ? avail.date : new Date(avail.date).toISOString().slice(0, 10);
    const slotStart = new Date(`${dateStr}T${avail.startTime}Z`);
    const slotEnd = new Date(`${dateStr}T${avail.endTime}Z`);
    const activeLesson = await this.resRepo.findOne({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(slotStart, slotEnd),
      },
    });
    if (activeLesson) {
      throw new BadRequestException(
        'Bu slotta aktif ders var. Önce dersi iptal edin veya taşıyın.',
      );
    }

    await this.availRepo.remove(avail);
    return { ok: true };
  }

  // ─── Students ───────────────────────────────────────────────────────────────

  async listStudents(user: User) {
    const trainer = await this.resolveTrainer(user);
    const links = await this.linksRepo.find({
      where: { trainerId: trainer.id, status: 'active' },
      relations: ['memberUser'],
      order: { createdAt: 'DESC' },
    });

    const result = [];
    for (const link of links) {
      const lastLesson = await this.resRepo.findOne({
        where: {
          trainerId: trainer.id,
          userId: link.memberUserId,
          status: ReservationStatus.CONFIRMED,
        },
        order: { startTime: 'DESC' },
      });
      result.push({
        userId: link.memberUserId,
        firstName: link.memberUser.firstName,
        lastName: link.memberUser.lastName,
        email: link.memberUser.email,
        phone: link.memberUser.phone,
        photoUrl: link.memberUser.photoUrl,
        source: link.source,
        connectedAt: link.createdAt,
        lastLessonAt: lastLesson?.startTime ?? null,
      });
    }
    return result;
  }

  async getStudentDetail(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const link = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: studentUserId, status: 'active' },
      relations: ['memberUser'],
    });
    if (!link) throw new NotFoundException('Öğrenci bulunamadı');

    const now = new Date();

    const [notes, completedLessons, cancelledLessons, upcomingLessons, totalLessons] =
      await Promise.all([
        this.notesRepo.find({
          where: { trainerId: trainer.id, memberUserId: studentUserId },
          order: { createdAt: 'DESC' },
          take: 20,
        }),
        this.resRepo.count({
          where: {
            trainerId: trainer.id,
            userId: studentUserId,
            status: In([ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED]),
            startTime: Between(new Date('2020-01-01'), now) as never,
          },
        }),
        this.resRepo.count({
          where: {
            trainerId: trainer.id,
            userId: studentUserId,
            status: ReservationStatus.CANCELLED,
          },
        }),
        this.resRepo.find({
          where: {
            trainerId: trainer.id,
            userId: studentUserId,
            status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
            startTime: MoreThanOrEqual(now),
          },
          order: { startTime: 'ASC' },
          take: 5,
        }),
        this.resRepo.count({
          where: { trainerId: trainer.id, userId: studentUserId },
        }),
      ]);

    // Only show packages assigned to this trainer (or PT packages)
    const packages = await this.packagesRepo.find({
      where: [
        { userId: studentUserId, assignedTrainerId: trainer.id, status: In(['active'] as never[]) },
        { userId: studentUserId, status: In(['active'] as never[]) },
      ],
      relations: ['packageType'],
    });
    // Filter: only PT packages or packages assigned to this trainer
    const relevantPackages = packages.filter(
      (p) =>
        p.assignedTrainerId === trainer.id ||
        (p.packageType && p.packageType.sessionType === SessionType.PERSONAL_TRAINING),
    );

    return {
      userId: link.memberUserId,
      firstName: link.memberUser.firstName,
      lastName: link.memberUser.lastName,
      email: link.memberUser.email,
      phone: link.memberUser.phone,
      photoUrl: link.memberUser.photoUrl,
      source: link.source,
      connectedAt: link.createdAt,
      // Stats
      totalLessons,
      completedLessons,
      cancelledLessons,
      upcomingCount: upcomingLessons.length,
      nextLesson: upcomingLessons[0]
        ? { startTime: upcomingLessons[0].startTime, endTime: upcomingLessons[0].endTime }
        : null,
      // Notes
      notes: notes.map((n) => ({ id: n.id, note: n.note, createdAt: n.createdAt })),
      // Only relevant packages (PT / assigned to this trainer)
      packages: relevantPackages.map((p) => ({
        id: p.id,
        name: p.packageType?.name ?? 'PT Paketi',
        remainingSessions: p.remainingSessions,
        expiresAt: p.expiresAt,
      })),
    };
  }

  async addExternalStudent(
    user: User,
    data: { firstName: string; lastName: string; email: string; phone: string },
  ) {
    const trainer = await this.resolveTrainer(user);

    // Check if user already exists
    let student = await this.usersRepo.findOne({
      where: [{ email: data.email.toLowerCase() }, { phone: data.phone }],
    });

    if (!student) {
      // Create new user
      student = this.usersRepo.create({
        tenantId: trainer.tenantId,
        email: data.email.toLowerCase(),
        username: data.email.split('@')[0] + Math.floor(Math.random() * 1000),
        passwordHash: '$2b$12$placeholder_external_student_no_login',
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        role: UserRole.MEMBER,
        accountStatus: MemberAccountStatus.ACTIVE,
      });
      await this.usersRepo.save(student);
    }

    // Check existing link
    const existing = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: student.id },
    });
    if (existing) {
      if (existing.status === 'archived') {
        existing.status = 'active';
        existing.source = 'trainer_added';
        await this.linksRepo.save(existing);
        return { ok: true, userId: student.id, reactivated: true };
      }
      throw new ConflictException('Bu öğrenci zaten bağlı');
    }

    const link = this.linksRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId: student.id,
      status: 'active',
      source: 'trainer_added',
    });
    await this.linksRepo.save(link);

    // Notify student
    void this.pushService.sendToUser(
      student.id,
      '🏋️ Eğitmen Bağlantısı',
      `${user.firstName} ${user.lastName} sizi öğrenci olarak ekledi.`,
      { type: 'trainer_link' },
    );

    return { ok: true, userId: student.id, reactivated: false };
  }

  async archiveStudent(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const link = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: studentUserId, status: 'active' },
    });
    if (!link) throw new NotFoundException('Öğrenci bulunamadı');
    link.status = 'archived';
    await this.linksRepo.save(link);
    return { ok: true };
  }

  // ─── Invite Code & Search ──────────────────────────────────────────────────

  /** Eğitmenin davet kodunu getir (yoksa oluştur) */
  async getInviteCode(user: User) {
    const trainer = await this.resolveTrainer(user);
    if (!trainer.inviteCode) {
      trainer.inviteCode = this.generateInviteCode();
      await this.trainersRepo.save(trainer);
    }
    return { inviteCode: trainer.inviteCode };
  }

  /** Username veya e-posta ile kullanıcı ara */
  async searchUser(user: User, query: string) {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return { results: [] };

    const results = await this.usersRepo
      .createQueryBuilder('u')
      .where('(LOWER(u.username) LIKE :q OR LOWER(u.email) LIKE :q)', { q: `%${q}%` })
      .andWhere('u.id != :myId', { myId: user.id })
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.username', 'u.email', 'u.photoUrl'])
      .take(10)
      .getMany();

    const trainer = await this.resolveTrainer(user);

    // Check which ones are already linked
    const linkedIds = new Set(
      (
        await this.linksRepo.find({ where: { trainerId: trainer.id }, select: ['memberUserId'] })
      ).map((l) => l.memberUserId),
    );

    return {
      results: results.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        email: u.email,
        photoUrl: u.photoUrl,
        isLinked: linkedIds.has(u.id),
      })),
    };
  }

  /** Arama sonucundan direkt öğrenci ekle */
  async addStudentById(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const student = await this.usersRepo.findOne({ where: { id: studentUserId } });
    if (!student) throw new NotFoundException('Kullanıcı bulunamadı');

    const existing = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: student.id },
    });
    if (existing) {
      if (existing.status === 'archived') {
        existing.status = 'active';
        existing.source = 'trainer_added';
        await this.linksRepo.save(existing);
        return { ok: true, userId: student.id, reactivated: true };
      }
      throw new ConflictException('Bu öğrenci zaten bağlı');
    }

    const link = this.linksRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId: student.id,
      status: 'active',
      source: 'trainer_added',
    });
    await this.linksRepo.save(link);

    void this.pushService.sendToUser(
      student.id,
      '🏋️ Eğitmen Bağlantısı',
      `${user.firstName} ${user.lastName} sizi öğrenci olarak ekledi.`,
      { type: 'trainer_link' },
    );

    return { ok: true, userId: student.id, reactivated: false };
  }

  /** Davet kodu ile eğitmene bağlan (öğrenci tarafı) */
  async connectByInviteCode(user: User, inviteCode: string) {
    const code = inviteCode.trim().toUpperCase();
    const trainer = await this.trainersRepo.findOne({
      where: { inviteCode: code },
      relations: ['user'],
    });
    if (!trainer) throw new NotFoundException('Geçersiz davet kodu');

    const existing = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: user.id },
    });
    if (existing) {
      if (existing.status === 'archived') {
        existing.status = 'active';
        existing.source = 'member_request';
        await this.linksRepo.save(existing);
        return {
          ok: true,
          trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
          reactivated: true,
        };
      }
      throw new ConflictException('Bu eğitmene zaten bağlısınız');
    }

    const link = this.linksRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId: user.id,
      status: 'active',
      source: 'member_request',
    });
    await this.linksRepo.save(link);

    void this.pushService.sendToUser(
      trainer.userId,
      '👥 Yeni Öğrenci',
      `${user.firstName} ${user.lastName} davet kodunuzla bağlandı.`,
      { type: 'new_student' },
    );

    return {
      ok: true,
      trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
      reactivated: false,
    };
  }

  /** E-posta/SMS ile davet gönder (sistemde olmayan kişi) */
  async sendInvite(user: User) {
    const trainer = await this.resolveTrainer(user);
    if (!trainer.inviteCode) {
      trainer.inviteCode = this.generateInviteCode();
      await this.trainersRepo.save(trainer);
    }
    // For now just return the invite code — SMS/email integration can be added later
    return {
      ok: true,
      inviteCode: trainer.inviteCode,
      message: `Davet kodu: ${trainer.inviteCode}. Öğrencinize bu kodu paylaşın.`,
    };
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // ─── Notes ──────────────────────────────────────────────────────────────────

  async getStudentNotes(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const notes = await this.notesRepo.find({
      where: { trainerId: trainer.id, memberUserId: studentUserId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return notes.map((n) => ({ id: n.id, note: n.note, createdAt: n.createdAt }));
  }

  async addStudentNote(user: User, studentUserId: string, note: string) {
    const trainer = await this.resolveTrainer(user);
    const link = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: studentUserId, status: 'active' },
    });
    if (!link) throw new NotFoundException('Öğrenci bulunamadı');

    const row = this.notesRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId: studentUserId,
      createdByUserId: user.id,
      note: note.trim(),
    });
    await this.notesRepo.save(row);
    return { id: row.id, createdAt: row.createdAt };
  }

  // ─── Pending Requests (Onay Bekleyen Talepler) ───────────────────────────────

  async getPendingRequests(user: User) {
    const trainer = await this.resolveTrainer(user);
    const pending = await this.resRepo.find({
      where: {
        trainerId: trainer.id,
        status: ReservationStatus.PENDING,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return pending.map((r) => ({
      id: r.id,
      studentName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      studentId: r.userId,
      studentEmail: r.user.email,
      studentPhone: r.user.phone,
      sessionType: r.sessionType,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      createdAt: r.createdAt.toISOString(),
      notes: r.notes,
    }));
  }

  async approveRequest(user: User, reservationId: string) {
    const trainer = await this.resolveTrainer(user);
    const reservation = await this.resRepo.findOne({
      where: { id: reservationId, trainerId: trainer.id, status: ReservationStatus.PENDING },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Talep bulunamadı');

    reservation.status = ReservationStatus.CONFIRMED;
    await this.resRepo.save(reservation);

    // Notify student
    const student = reservation.user;
    if (student) {
      const date = reservation.startTime.toLocaleDateString('tr-TR');
      const time = reservation.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      void this.notifier.studentLessonCreated({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        date,
        time,
      });
    }

    return { ok: true, status: 'confirmed' };
  }

  async rejectRequest(user: User, reservationId: string, reason?: string) {
    const trainer = await this.resolveTrainer(user);
    const reservation = await this.resRepo.findOne({
      where: { id: reservationId, trainerId: trainer.id, status: ReservationStatus.PENDING },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Talep bulunamadı');

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancelledBy = 'trainer';
    reservation.cancelReason = reason?.trim() || 'Eğitmen tarafından reddedildi';
    await this.resRepo.save(reservation);

    // Refund package session
    if (reservation.packageId) {
      const pkg = await this.packagesRepo.findOne({ where: { id: reservation.packageId } });
      if (pkg) {
        pkg.remainingSessions += 1;
        await this.packagesRepo.save(pkg);
      }
    }

    // Notify student
    const student = reservation.user;
    if (student) {
      const date = reservation.startTime.toLocaleDateString('tr-TR');
      const time = reservation.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      void this.notifier.studentLessonCancelled({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        date,
        time,
        reason: reason?.trim() || 'Eğitmen tarafından reddedildi',
      });
    }

    return { ok: true, status: 'rejected' };
  }

  // ─── Lessons ────────────────────────────────────────────────────────────────

  async getLessons(user: User, date?: string, view?: string) {
    const trainer = await this.resolveTrainer(user);
    const now = new Date();
    let from: Date;
    let to: Date;

    if (date) {
      from = new Date(date + 'T00:00:00Z');
      if (view === 'weekly') {
        to = new Date(from);
        to.setDate(to.getDate() + 7);
      } else {
        to = new Date(date + 'T23:59:59Z');
      }
    } else {
      from = now;
      to = new Date(now);
      to.setDate(to.getDate() + 30);
    }

    const lessons = await this.resRepo.find({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(from, to),
      },
      relations: ['user'],
      order: { startTime: 'ASC' },
    });

    return lessons.map((r) => ({
      id: r.id,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      studentName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      studentId: r.userId,
      type: r.sessionType,
      status: r.status,
      notes: r.notes,
    }));
  }

  async createLesson(
    user: User,
    data: { availabilityId: string; studentUserId: string; type?: string; notes?: string },
  ) {
    const trainer = await this.resolveTrainer(user);

    const avail = await this.availRepo.findOne({
      where: { id: data.availabilityId, trainerId: trainer.id },
    });
    if (!avail) throw new NotFoundException('Slot bulunamadı');

    const dateStr =
      typeof avail.date === 'string' ? avail.date : new Date(avail.date).toISOString().slice(0, 10);
    const startTime = new Date(`${dateStr}T${avail.startTime}Z`);
    const endTime = new Date(`${dateStr}T${avail.endTime}Z`);

    // Check conflict
    const conflict = await this.resRepo.findOne({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(startTime, endTime),
      },
    });
    if (conflict) throw new ConflictException('Bu slot dolu');

    const reservation = this.resRepo.create({
      userId: data.studentUserId,
      trainerId: trainer.id,
      tenantId: trainer.tenantId,
      sessionType: (data.type as SessionType) || SessionType.PERSONAL_TRAINING,
      startTime,
      endTime,
      status: ReservationStatus.CONFIRMED,
      notes: data.notes?.trim() || null,
      packageId: null as never,
      timeSlotId: null as never,
    });
    await this.resRepo.save(reservation);

    // Notify student (push + SMS + mail)
    const student = await this.usersRepo.findOne({ where: { id: data.studentUserId } });
    if (student) {
      void this.notifier.studentLessonCreated({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        date: dateStr,
        time: avail.startTime.slice(0, 5),
      });
    }

    return { id: reservation.id, startTime: reservation.startTime, endTime: reservation.endTime };
  }

  async cancelLesson(user: User, lessonId: string, reason?: string) {
    const trainer = await this.resolveTrainer(user);
    const lesson = await this.resRepo.findOne({
      where: {
        id: lessonId,
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
      },
      relations: ['user'],
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');

    lesson.status = ReservationStatus.CANCELLED;
    lesson.cancelledAt = new Date();
    lesson.cancelledBy = 'trainer';
    lesson.cancelReason = reason?.trim() || null;
    await this.resRepo.save(lesson);

    // Notify student (push + SMS + mail)
    const student = await this.usersRepo.findOne({ where: { id: lesson.userId } });
    if (student) {
      const date = lesson.startTime.toLocaleDateString('tr-TR');
      const time = lesson.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      void this.notifier.studentLessonCancelled({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        date,
        time,
        reason: reason?.trim() || null,
      });
    }

    return { ok: true, cancelled: true };
  }

  async rescheduleLesson(user: User, lessonId: string, newAvailabilityId: string, note?: string) {
    const trainer = await this.resolveTrainer(user);
    const lesson = await this.resRepo.findOne({
      where: {
        id: lessonId,
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
      },
      relations: ['user'],
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');

    const newAvail = await this.availRepo.findOne({
      where: { id: newAvailabilityId, trainerId: trainer.id },
    });
    if (!newAvail) throw new NotFoundException('Yeni slot bulunamadı');

    const newDateStr =
      typeof newAvail.date === 'string'
        ? newAvail.date
        : new Date(newAvail.date).toISOString().slice(0, 10);
    const newStart = new Date(`${newDateStr}T${newAvail.startTime}Z`);
    const newEnd = new Date(`${newDateStr}T${newAvail.endTime}Z`);

    // Check conflict on new slot
    const conflict = await this.resRepo.findOne({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(newStart, newEnd),
      },
    });
    if (conflict && conflict.id !== lesson.id) throw new ConflictException('Yeni slot dolu');

    const oldTime = lesson.startTime.toISOString();
    lesson.startTime = newStart;
    lesson.endTime = newEnd;
    lesson.rescheduleNote = note?.trim() || `Eski: ${oldTime}`;
    await this.resRepo.save(lesson);

    // Notify student (push + SMS + mail)
    const student = await this.usersRepo.findOne({ where: { id: lesson.userId } });
    if (student) {
      const oldDate = new Date(oldTime).toLocaleDateString('tr-TR');
      const oldTimeStr = new Date(oldTime).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      void this.notifier.studentLessonRescheduled({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        oldDate,
        oldTime: oldTimeStr,
        newDate: newDateStr,
        newTime: newAvail.startTime.slice(0, 5),
      });
    }

    return { ok: true, newStartTime: newStart, newEndTime: newEnd };
  }

  // ─── Student History & Packages ─────────────────────────────────────────────

  async getStudentHistory(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const lessons = await this.resRepo.find({
      where: { trainerId: trainer.id, userId: studentUserId },
      order: { startTime: 'DESC' },
      take: 50,
    });
    return lessons.map((r) => ({
      id: r.id,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      type: r.sessionType,
      status: r.status,
    }));
  }

  async getStudentPackages(user: User, studentUserId: string) {
    const trainer = await this.resolveTrainer(user);
    // Verify link
    const link = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: studentUserId, status: 'active' },
    });
    if (!link) throw new NotFoundException('Öğrenci bulunamadı');

    const packages = await this.packagesRepo.find({
      where: { userId: studentUserId },
      relations: ['packageType'],
      order: { createdAt: 'DESC' },
    });
    return packages.map((p) => ({
      id: p.id,
      name: p.packageType?.name ?? 'Paket',
      remainingSessions: p.remainingSessions,
      expiresAt: p.expiresAt,
      status: p.status,
    }));
  }

  // ─── Club Connection (Kulübe Bağlanma) ───────────────────────────────────────

  /** Bağımsız eğitmen: kulüp kodunu girerek başvuru gönder */
  async joinClubByCode(user: User, clubCode: string) {
    if (user.role !== UserRole.INDEPENDENT_TRAINER) {
      throw new BadRequestException('Sadece bağımsız eğitmenler kulübe başvurabilir');
    }

    const code = clubCode.trim().toUpperCase();
    const tenantRepo = this.usersRepo.manager.getRepository('Tenant');
    const club = (await tenantRepo.findOne({ where: { inviteCode: code } })) as {
      id: string;
      name: string;
      subdomain: string;
    } | null;
    if (!club) throw new NotFoundException('Geçersiz kulüp kodu');

    // Check if already applied
    const trainerAppRepo = this.usersRepo.manager.getRepository('TrainerApplication');
    const existing = await trainerAppRepo.findOne({
      where: { userId: user.id, preferredClubSubdomain: club.subdomain },
    });
    if (existing) throw new ConflictException('Bu kulübe zaten başvurdunuz');

    const trainer = await this.resolveTrainer(user);

    // Create trainer application
    const app = trainerAppRepo.create({
      userId: user.id,
      trainerId: trainer.id,
      tenantId: trainer.tenantId,
      status: 'pending',
      preferredClubSubdomain: club.subdomain,
      adminNote: null,
      reviewedByUserId: null,
      reviewedAt: null,
    });
    await trainerAppRepo.save(app);

    // Notify club admin
    const admins = await this.usersRepo.find({
      where: { tenantId: club.id, role: UserRole.ADMINISTRATOR },
    });
    for (const admin of admins) {
      void this.pushService.sendToUser(
        admin.id,
        '🏋️ Yeni Eğitmen Başvurusu',
        `${user.firstName} ${user.lastName} kulübünüze eğitmen olarak başvurdu.`,
        { type: 'trainer_application' },
      );
    }

    return {
      ok: true,
      clubName: club.name,
      message: 'Başvurunuz kulübe iletildi. Onay bekleniyor.',
    };
  }

  // ─── Profile ────────────────────────────────────────────────────────────────

  async getProfile(user: User) {
    const trainer = await this.resolveTrainer(user);
    const profile = await this.profilesRepo.findOne({ where: { trainerId: trainer.id } });
    return {
      trainerId: trainer.id,
      bio: profile?.bio ?? trainer.bio,
      specialties: profile?.specialties ?? [],
      certifications: profile?.certifications ?? [],
      experienceYears: profile?.experienceYears ?? null,
      city: profile?.city ?? '',
      photoUrl: profile?.photoUrl ?? trainer.photoUrl,
      pricingNote: profile?.pricingNote ?? null,
      role: user.role,
    };
  }

  async updateProfile(
    user: User,
    data: {
      bio?: string;
      specialties?: string[];
      certifications?: string[];
      experienceYears?: number;
      city?: string;
      photoUrl?: string;
      pricingNote?: string;
    },
  ) {
    const trainer = await this.resolveTrainer(user);
    let profile = await this.profilesRepo.findOne({ where: { trainerId: trainer.id } });

    if (!profile) {
      profile = this.profilesRepo.create({
        userId: user.id,
        trainerId: trainer.id,
        tenantId: trainer.tenantId,
        city: data.city ?? '',
        bio: data.bio ?? '',
        specialties: data.specialties ?? [],
      });
    }

    if (data.bio !== undefined) profile.bio = data.bio;
    if (data.specialties !== undefined) profile.specialties = data.specialties;
    if (data.certifications !== undefined) profile.certifications = data.certifications;
    if (data.experienceYears !== undefined) profile.experienceYears = data.experienceYears;
    if (data.city !== undefined) profile.city = data.city;
    if (data.photoUrl !== undefined) profile.photoUrl = data.photoUrl;
    if (data.pricingNote !== undefined) profile.pricingNote = data.pricingNote;

    await this.profilesRepo.save(profile);

    // Also update trainer entity
    if (data.bio !== undefined) trainer.bio = data.bio;
    if (data.photoUrl !== undefined) trainer.photoUrl = data.photoUrl;
    await this.trainersRepo.save(trainer);

    return { ok: true };
  }

  // ─── Profil Yönetimi ──────────────────────────────────────────────────────────

  /** Eğitmen kendi profil bilgilerini getirir */
  async getMyProfile(user: User) {
    const trainer = await this.resolveTrainer(user);
    const profile = await this.profilesRepo.findOne({ where: { trainerId: trainer.id } });
    return {
      id: trainer.id,
      bio: trainer.bio,
      photoUrl: trainer.photoUrl ?? user.photoUrl,
      specializations: trainer.specializations ?? [],
      certifications: trainer.certifications ?? [],
      offersSessionTypes: trainer.offersSessionTypes ?? [],
      avgRating: trainer.avgRating,
      totalSessions: trainer.totalSessions,
      pricingNote: profile?.pricingNote ?? null,
      city: profile?.city ?? null,
      experienceYears: profile?.experienceYears ?? null,
    };
  }

  /** Eğitmen kendi profil bilgilerini günceller */
  async updateMyProfile(
    user: User,
    data: {
      bio?: string;
      specializations?: string[];
      certifications?: string[];
      photoUrl?: string;
      offersSessionTypes?: string[];
      pricingNote?: string;
    },
  ) {
    const trainer = await this.resolveTrainer(user);

    if (data.bio !== undefined) trainer.bio = data.bio.trim();
    if (data.specializations !== undefined) trainer.specializations = data.specializations;
    if (data.certifications !== undefined) trainer.certifications = data.certifications;
    if (data.photoUrl !== undefined) {
      trainer.photoUrl = data.photoUrl.trim() || null;
      // User tablosunu da güncelle
      await this.usersRepo.update({ id: user.id }, { photoUrl: trainer.photoUrl });
    }
    if (data.offersSessionTypes !== undefined) trainer.offersSessionTypes = data.offersSessionTypes;
    await this.trainersRepo.save(trainer);

    // TrainerProfile varsa onu da güncelle
    const profile = await this.profilesRepo.findOne({ where: { trainerId: trainer.id } });
    if (profile) {
      if (data.bio !== undefined) profile.bio = data.bio.trim();
      if (data.specializations !== undefined) profile.specialties = data.specializations;
      if (data.certifications !== undefined) profile.certifications = data.certifications;
      if (data.photoUrl !== undefined) profile.photoUrl = trainer.photoUrl;
      if (data.pricingNote !== undefined) profile.pricingNote = data.pricingNote.trim() || null;
      await this.profilesRepo.save(profile);
    }

    return { ok: true };
  }

  // ─── Push Bildirim ────────────────────────────────────────────────────────────

  /** PT: öğrencilerine toplu push bildirim gönder */
  async sendPushToStudents(
    user: User,
    data: { title: string; message: string; imageUrl?: string },
  ) {
    if (!data.title?.trim() || !data.message?.trim()) {
      throw new BadRequestException('Başlık ve mesaj zorunludur');
    }
    const trainer = await this.resolveTrainer(user);
    const links = await this.linksRepo.find({
      where: { trainerId: trainer.id, status: 'active' },
      select: ['memberUserId'],
    });
    const studentIds = links.map((l) => l.memberUserId);
    if (studentIds.length === 0) {
      return { ok: true, sent: 0, total: 0, message: 'Henüz öğrenciniz yok' };
    }
    const result = await this.pushService.sendToMany(
      studentIds,
      data.title.trim(),
      data.message.trim(),
      { type: 'trainer_notification', trainerId: trainer.id },
      data.imageUrl?.trim() ?? null,
    );
    return { ok: true, sent: result.sent, total: result.total };
  }
}
