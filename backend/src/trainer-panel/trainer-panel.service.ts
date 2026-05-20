import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm';
import { Availability } from '../database/entities/availability.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Resource } from '../database/entities/resource.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { TrainerMemberNote } from '../database/entities/trainer-member-note.entity';
import { TrainerMemberMeasurement } from '../database/entities/trainer-member-measurement.entity';
import {
  TrainerMemberAssessment,
  type AssessmentType,
} from '../database/entities/trainer-member-assessment.entity';
import { TrainerMemberPhoto } from '../database/entities/trainer-member-photo.entity';
import {
  TrainerMemberGoal,
  type GoalCategory,
  type GoalStatus,
} from '../database/entities/trainer-member-goal.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { User } from '../database/entities/user.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { Announcement } from '../database/entities/announcement.entity';
import { ReservationStatus, SessionType, MemberAccountStatus, UserRole } from '../database/enums';
import { PushService } from '../notifications/push.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class TrainerPanelService {
  constructor(
    @InjectRepository(Availability) private readonly availRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TrainerProfile) private readonly profilesRepo: Repository<TrainerProfile>,
    @InjectRepository(TrainerMemberLink) private readonly linksRepo: Repository<TrainerMemberLink>,
    @InjectRepository(TrainerMemberNote) private readonly notesRepo: Repository<TrainerMemberNote>,
    @InjectRepository(TrainerMemberMeasurement)
    private readonly measurementsRepo: Repository<TrainerMemberMeasurement>,
    @InjectRepository(TrainerMemberAssessment)
    private readonly assessmentsRepo: Repository<TrainerMemberAssessment>,
    @InjectRepository(TrainerMemberPhoto)
    private readonly photosRepo: Repository<TrainerMemberPhoto>,
    @InjectRepository(TrainerMemberGoal)
    private readonly goalsRepo: Repository<TrainerMemberGoal>,
    @InjectRepository(Package) private readonly packagesRepo: Repository<Package>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Announcement) private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(Resource) private readonly resourcesRepo: Repository<Resource>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
    @InjectRepository(ClubEvent) private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly eventRegRepo: Repository<ClubEventRegistration>,
    private readonly pushService: PushService,
    private readonly notifier: NotificationDispatcher,
    private readonly messagingService: MessagingService,
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

  /**
   * Çalışma şablonu: belirli haftalar boyunca, belirli günlerde,
   * verilen saat aralığında (startHour-endHour) saatlik slotlar oluştur.
   * Örn: "Pzt-Cum 09-18, 4 hafta" → 5 gün × 9 saat × 4 hafta = 180 slot
   */
  async applyScheduleTemplate(
    user: User,
    data: {
      startDate: string;
      weeks: number;
      weekdays: number[];
      startHour: number;
      endHour: number;
      slotMinutes?: number;
    },
  ) {
    const trainer = await this.resolveTrainer(user);
    const slotMinutes = data.slotMinutes ?? 60;
    const start = new Date(data.startDate + 'T12:00:00');
    let createdCount = 0;
    let skippedCount = 0;

    for (let w = 0; w < data.weeks; w++) {
      for (const wd of data.weekdays) {
        const d = new Date(start);
        // wd: 1=Pzt..7=Pzr (ISO weekday). JS getDay: 0=Pzr..6=Cmt → uyumluluk
        const jsDay = wd === 7 ? 0 : wd; // Pzr için 0
        d.setDate(d.getDate() + w * 7 + ((jsDay - start.getDay() + 7) % 7));
        const dateStr = d.toISOString().slice(0, 10);

        for (let h = data.startHour; h < data.endHour; h += slotMinutes / 60) {
          const startTime = `${String(Math.floor(h)).padStart(2, '0')}:${String((h % 1) * 60).padStart(2, '0')}:00`;
          const endH = h + slotMinutes / 60;
          const endTime = `${String(Math.floor(endH)).padStart(2, '0')}:${String((endH % 1) * 60).padStart(2, '0')}:00`;

          // Aynı saat varsa atla
          const existing = await this.availRepo.findOne({
            where: {
              trainerId: trainer.id,
              date: dateStr,
              startTime,
            },
          });
          if (existing) {
            skippedCount++;
            continue;
          }
          const avail = this.availRepo.create({
            trainerId: trainer.id,
            date: dateStr,
            startTime,
            endTime,
            available: true,
          });
          await this.availRepo.save(avail);
          createdCount++;
        }
      }
    }

    return { created: createdCount, skipped: skippedCount };
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

    // Önce link'i ara (tercihen)
    const link = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: studentUserId },
      relations: ['memberUser'],
    });

    let memberUser = link?.memberUser ?? null;

    if (!memberUser) {
      // Link yok — tenant'taki kullanıcıyı doğrudan getir
      const u = await this.usersRepo.findOne({
        where: { id: studentUserId, tenantId: trainer.tenantId },
      });
      if (!u) throw new NotFoundException('Öğrenci bulunamadı');
      memberUser = u;
    }

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
      userId: studentUserId,
      firstName: memberUser.firstName,
      lastName: memberUser.lastName,
      email: memberUser.email,
      phone: memberUser.phone,
      photoUrl: memberUser.photoUrl,
      source: link?.source ?? 'lesson_history',
      connectedAt: link?.createdAt ?? memberUser.createdAt,
      linkStatus: link?.status ?? 'none',
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

  /**
   * Eğitmenin tenant'ındaki tüm aktif üyeleri listeler (ders oluştururken seçmek için).
   * Bağlı öğrenciler `linked: true` olarak işaretlenir.
   */
  async listAvailableMembers(user: User) {
    const trainer = await this.resolveTrainer(user);

    const [members, links] = await Promise.all([
      this.usersRepo.find({
        where: {
          tenantId: trainer.tenantId,
          role: UserRole.MEMBER,
          accountStatus: MemberAccountStatus.ACTIVE,
        },
        select: ['id', 'firstName', 'lastName', 'email', 'phone', 'photoUrl'],
        order: { firstName: 'ASC' },
        take: 500,
      }),
      this.linksRepo.find({
        where: { trainerId: trainer.id, status: 'active' },
        select: ['memberUserId'],
      }),
    ]);

    const linkedIds = new Set(links.map((l) => l.memberUserId));

    return members.map((m) => ({
      userId: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      photoUrl: m.photoUrl,
      linked: linkedIds.has(m.id),
    }));
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

  // ─── Lesson — Direct create / reschedule / complete / remind / clear day ───
  // Admin paritesi için: availabilityId olmadan tarih+saat ile çalışan versiyonlar.

  /** Trainer kendi tarih+saat vererek doğrudan ders oluşturur (slot otomatik oluşturulur). */
  async createLessonDirect(
    user: User,
    data: {
      studentUserId: string;
      date: string;
      startTime: string;
      endTime: string;
      type?: string;
      notes?: string;
      packageId?: string;
      recurringWeeks?: number;
    },
  ) {
    const trainer = await this.resolveTrainer(user);

    const recurringWeeks = Math.max(1, Math.min(data.recurringWeeks ?? 1, 26));
    const created: Array<{ id: string; startTime: Date; endTime: Date }> = [];

    for (let w = 0; w < recurringWeeks; w++) {
      const baseDate = new Date(data.date.slice(0, 10) + 'T12:00:00');
      baseDate.setDate(baseDate.getDate() + w * 7);
      const dateStr = baseDate.toISOString().slice(0, 10);
      const startTime = new Date(`${dateStr}T${data.startTime}Z`);
      const endTime = new Date(`${dateStr}T${data.endTime}Z`);

      if (endTime <= startTime) {
        throw new BadRequestException('Bitiş saati başlangıçtan sonra olmalı');
      }

      // Conflict check
      const conflict = await this.resRepo.findOne({
        where: {
          trainerId: trainer.id,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
          startTime: Between(startTime, endTime),
        },
      });
      if (conflict) {
        if (recurringWeeks === 1) {
          throw new ConflictException('Bu saatte başka bir ders var');
        }
        // Tekrarda çakışan haftaları atla
        continue;
      }

      // Slot otomatik oluştur (yoksa)
      const existingAvail = await this.availRepo.findOne({
        where: {
          trainerId: trainer.id,
          date: dateStr,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      });
      if (!existingAvail) {
        const slot = this.availRepo.create({
          trainerId: trainer.id,
          date: dateStr,
          startTime: data.startTime,
          endTime: data.endTime,
          available: true,
        });
        await this.availRepo.save(slot);
      }

      // Paket bağlama: seans düş
      let packageId: string | null = null;
      let sessionsBefore: number | null = null;
      let sessionsAfter: number | null = null;
      if (data.packageId && w === 0) {
        // İlk derste paketi rezerve et — tekrarlayan derslerde her hafta için ayrı çekim yok
        // (kullanıcı isterse manuel her seans için ayrı paket atayabilir)
        const pkg = await this.packagesRepo.findOne({
          where: { id: data.packageId, userId: data.studentUserId },
        });
        if (pkg && pkg.remainingSessions > 0) {
          sessionsBefore = pkg.remainingSessions;
          pkg.remainingSessions -= 1;
          sessionsAfter = pkg.remainingSessions;
          await this.packagesRepo.save(pkg);
          packageId = pkg.id;
        }
      }

      const reservation = this.resRepo.create({
        userId: data.studentUserId,
        trainerId: trainer.id,
        tenantId: trainer.tenantId,
        sessionType: (data.type as SessionType) || SessionType.PERSONAL_TRAINING,
        startTime,
        endTime,
        status: ReservationStatus.CONFIRMED,
        notes: data.notes?.trim() || null,
        packageId: packageId as never,
        sessionsBefore,
        sessionsAfter,
        timeSlotId: null as never,
        // Gelir raporu için snapshot fiyat + komisyon
        lessonPrice: trainer.defaultLessonPrice,
        platformFee: (
          parseFloat(trainer.defaultLessonPrice) * parseFloat(trainer.commissionRate)
        ).toFixed(2),
      });
      await this.resRepo.save(reservation);
      created.push({ id: reservation.id, startTime: reservation.startTime, endTime: reservation.endTime });
    }

    if (created.length === 0) {
      throw new ConflictException('Tüm haftalarda çakışma var, ders oluşturulamadı');
    }

    // Otomatik link
    const existingLink = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: data.studentUserId },
    });
    if (!existingLink) {
      const link = this.linksRepo.create({
        tenantId: trainer.tenantId,
        trainerId: trainer.id,
        memberUserId: data.studentUserId,
        status: 'active',
        source: 'trainer_added',
      });
      await this.linksRepo.save(link);
    } else if (existingLink.status === 'archived') {
      existingLink.status = 'active';
      await this.linksRepo.save(existingLink);
    }

    // Notify student (sadece ilk ders için)
    const student = await this.usersRepo.findOne({ where: { id: data.studentUserId } });
    if (student && created.length > 0) {
      const firstLesson = created[0];
      void this.notifier.studentLessonCreated({
        student: {
          id: student.id,
          firstName: student.firstName,
          email: student.email,
          phone: student.phone,
        },
        trainerName: `${user.firstName} ${user.lastName}`.trim(),
        date: firstLesson.startTime.toISOString().slice(0, 10),
        time: data.startTime.slice(0, 5),
      });
    }

    return {
      created: created.length,
      lessons: created.map((c) => ({
        id: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
    };
  }

  /** Trainer kendi dersini doğrudan tarih+saat vererek taşır. */
  async rescheduleLessonDirect(
    user: User,
    lessonId: string,
    data: { newDate: string; newStartTime: string; newEndTime: string; note?: string },
  ) {
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

    const newDateStr = data.newDate.slice(0, 10);
    const newStart = new Date(`${newDateStr}T${data.newStartTime}Z`);
    const newEnd = new Date(`${newDateStr}T${data.newEndTime}Z`);

    if (newEnd <= newStart) {
      throw new BadRequestException('Bitiş saati başlangıçtan sonra olmalı');
    }

    // Conflict (kendisi hariç)
    const conflict = await this.resRepo.findOne({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(newStart, newEnd),
      },
    });
    if (conflict && conflict.id !== lesson.id) throw new ConflictException('Yeni saat dolu');

    // Slot otomatik oluştur (yoksa)
    const existingAvail = await this.availRepo.findOne({
      where: {
        trainerId: trainer.id,
        date: newDateStr,
        startTime: data.newStartTime,
        endTime: data.newEndTime,
      },
    });
    if (!existingAvail) {
      const slot = this.availRepo.create({
        trainerId: trainer.id,
        date: newDateStr,
        startTime: data.newStartTime,
        endTime: data.newEndTime,
        available: true,
      });
      await this.availRepo.save(slot);
    }

    const oldTime = lesson.startTime.toISOString();
    lesson.startTime = newStart;
    lesson.endTime = newEnd;
    lesson.rescheduleNote = data.note?.trim() || `Eski: ${oldTime}`;
    await this.resRepo.save(lesson);

    // Notify
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
        newTime: data.newStartTime.slice(0, 5),
      });
    }

    return { ok: true, newStartTime: newStart, newEndTime: newEnd };
  }

  /** Dersi tamamlandı olarak işaretle. */
  async completeLesson(user: User, lessonId: string) {
    const trainer = await this.resolveTrainer(user);
    const lesson = await this.resRepo.findOne({
      where: {
        id: lessonId,
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
      },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    lesson.status = ReservationStatus.COMPLETED;
    await this.resRepo.save(lesson);
    return { ok: true, completed: true };
  }

  /** Üyeye manuel hatırlatma (push + sms). */
  async remindLesson(user: User, lessonId: string) {
    const trainer = await this.resolveTrainer(user);
    const lesson = await this.resRepo.findOne({
      where: { id: lessonId, trainerId: trainer.id },
      relations: ['user'],
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');

    const date = lesson.startTime.toLocaleDateString('tr-TR');
    const time = lesson.startTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    void this.notifier.studentLessonReminder({
      student: {
        id: lesson.user.id,
        firstName: lesson.user.firstName,
        email: lesson.user.email,
        phone: lesson.user.phone,
      },
      trainerName: `${user.firstName} ${user.lastName}`.trim(),
      date,
      time,
    });
    return { ok: true, sent: true };
  }

  /** Belirli bir günün tüm slotlarını (rezervasyonsuz) sil. */
  async clearDay(user: User, date: string) {
    const trainer = await this.resolveTrainer(user);
    const dateStr = date.slice(0, 10);

    // Aktif rezervasyonları kontrol et
    const dayStart = new Date(`${dateStr}T00:00:00Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59Z`);
    const activeLessons = await this.resRepo.count({
      where: {
        trainerId: trainer.id,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        startTime: Between(dayStart, dayEnd),
      },
    });
    if (activeLessons > 0) {
      throw new BadRequestException(
        `Bu günde ${activeLessons} aktif ders var. Önce dersleri iptal edin veya taşıyın.`,
      );
    }

    const slots = await this.availRepo.find({
      where: { trainerId: trainer.id, date: dateStr },
    });
    if (slots.length > 0) {
      await this.availRepo.remove(slots);
    }
    return { ok: true, deleted: slots.length };
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

  /**
   * Tenant'taki herhangi bir üyenin aktif PT paketlerini getir.
   * Ders oluştururken paket seçmek için kullanılır (link şartı yok).
   */
  async getMemberActivePackagesForBooking(user: User, memberUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const member = await this.usersRepo.findOne({
      where: { id: memberUserId, tenantId: trainer.tenantId },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    const packages = await this.packagesRepo.find({
      where: { userId: memberUserId },
      relations: ['packageType'],
      order: { createdAt: 'DESC' },
    });
    return packages
      .filter(
        (p) =>
          p.remainingSessions > 0 &&
          (p.packageType?.sessionType === 'personal_training' ||
            !p.packageType?.sessionType),
      )
      .map((p) => ({
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

  /**
   * Eğitmenin gelir/kazanç raporu.
   * - Bu ay, geçen ay, bu yıl gelirleri
   * - Komisyon hesabı
   * - Net kazanç
   * - Aylık trend (son 6 ay)
   * - Son 20 tamamlanmış ders detayı
   */
  async getEarnings(user: User) {
    const trainer = await this.resolveTrainer(user);
    const now = new Date();
    const commission = parseFloat(trainer.commissionRate);
    const defaultPrice = parseFloat(trainer.defaultLessonPrice);

    // Tarih sınırları
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Tüm tamamlanmış dersleri getir (gelir hesaplaması için)
    const allCompleted = await this.resRepo.find({
      where: {
        trainerId: trainer.id,
        status: ReservationStatus.COMPLETED,
        startTime: Between(yearStart, yearEnd),
      },
      order: { startTime: 'DESC' },
    });

    const calcRevenue = (reservations: Reservation[]) => {
      let gross = 0;
      let fee = 0;
      for (const r of reservations) {
        const price = r.lessonPrice ? parseFloat(r.lessonPrice) : defaultPrice;
        const platformFee = r.platformFee ? parseFloat(r.platformFee) : price * commission;
        gross += price;
        fee += platformFee;
      }
      return {
        gross: gross.toFixed(2),
        fee: fee.toFixed(2),
        net: (gross - fee).toFixed(2),
        count: reservations.length,
      };
    };

    const thisMonth = allCompleted.filter(
      (r) => r.startTime >= monthStart && r.startTime <= monthEnd,
    );
    const lastMonth = allCompleted.filter(
      (r) => r.startTime >= lastMonthStart && r.startTime <= lastMonthEnd,
    );
    const thisYear = allCompleted;

    // Aylık trend (son 6 ay)
    const trend: Array<{ month: string; revenue: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthRes = allCompleted.filter(
        (r) => r.startTime >= start && r.startTime <= end,
      );
      const monthCalc = calcRevenue(monthRes);
      trend.push({
        month: d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        revenue: monthCalc.net,
        count: monthCalc.count,
      });
    }

    // Son 20 tamamlanmış ders detayı (öğrenci bilgisiyle)
    const recentDetailed = await this.resRepo.find({
      where: {
        trainerId: trainer.id,
        status: ReservationStatus.COMPLETED,
      },
      relations: ['user'],
      order: { startTime: 'DESC' },
      take: 20,
    });

    return {
      commissionRate: trainer.commissionRate,
      commissionPercent: `%${(commission * 100).toFixed(1)}`,
      defaultLessonPrice: trainer.defaultLessonPrice,
      thisMonth: calcRevenue(thisMonth),
      lastMonth: calcRevenue(lastMonth),
      thisYear: calcRevenue(thisYear),
      monthlyTrend: trend,
      recentLessons: recentDetailed.map((r) => {
        const price = r.lessonPrice ? parseFloat(r.lessonPrice) : defaultPrice;
        const fee = r.platformFee ? parseFloat(r.platformFee) : price * commission;
        return {
          id: r.id,
          date: r.startTime.toISOString(),
          studentName: `${r.user.firstName} ${r.user.lastName}`.trim(),
          gross: price.toFixed(2),
          platformFee: fee.toFixed(2),
          net: (price - fee).toFixed(2),
          packageId: r.packageId,
        };
      }),
    };
  }

  // ─── Profile ────────────────────────────────────────────────────────────────

  async getProfile(user: User) {
    const trainer = await this.resolveTrainer(user);
    const profile = await this.profilesRepo.findOne({ where: { trainerId: trainer.id } });
    return {
      trainerId: trainer.id,
      // Kullanıcı bilgileri
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      publicId: user.publicId,
      // Trainer bilgileri
      bio: profile?.bio ?? trainer.bio ?? '',
      specialties: profile?.specialties ?? (trainer.specializations as string[]) ?? [],
      certifications:
        profile?.certifications ?? (trainer.certifications as string[]) ?? [],
      experienceYears: profile?.experienceYears ?? null,
      city: profile?.city ?? user.city ?? '',
      photoUrl: profile?.photoUrl ?? trainer.photoUrl ?? user.photoUrl ?? null,
      pricingNote: profile?.pricingNote ?? null,
      offersSessionTypes: trainer.offersSessionTypes ?? [],
      avgRating: trainer.avgRating,
      totalSessions: trainer.totalSessions,
      commissionRate: trainer.commissionRate,
      defaultLessonPrice: trainer.defaultLessonPrice,
      awayUntil: trainer.awayUntil,
      awayMessage: trainer.awayMessage,
      verified: trainer.verified,
      role: user.role,
    };
  }

  async updateProfile(
    user: User,
    data: {
      // User-level
      firstName?: string;
      lastName?: string;
      phone?: string;
      // Trainer-level
      bio?: string;
      specialties?: string[];
      certifications?: string[];
      experienceYears?: number;
      city?: string;
      photoUrl?: string;
      pricingNote?: string;
      offersSessionTypes?: string[];
      defaultLessonPrice?: number;
      awayUntil?: string | null;
      awayMessage?: string | null;
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
    if (data.specialties !== undefined) trainer.specializations = data.specialties;
    if (data.certifications !== undefined) trainer.certifications = data.certifications;
    if (data.photoUrl !== undefined) trainer.photoUrl = data.photoUrl;
    if (data.offersSessionTypes !== undefined)
      trainer.offersSessionTypes = data.offersSessionTypes;
    if (data.defaultLessonPrice !== undefined && data.defaultLessonPrice >= 0)
      trainer.defaultLessonPrice = String(data.defaultLessonPrice);
    if (data.awayUntil !== undefined) trainer.awayUntil = data.awayUntil;
    if (data.awayMessage !== undefined) trainer.awayMessage = data.awayMessage;
    await this.trainersRepo.save(trainer);

    // Update user-level fields
    const userUpdates: Record<string, string | null> = {};
    if (data.firstName !== undefined) userUpdates.firstName = data.firstName.trim();
    if (data.lastName !== undefined) userUpdates.lastName = data.lastName.trim();
    if (data.phone !== undefined) userUpdates.phone = data.phone.trim() || null;
    if (data.city !== undefined) userUpdates.city = data.city.trim() || null;
    if (data.photoUrl !== undefined) userUpdates.photoUrl = data.photoUrl || null;
    if (Object.keys(userUpdates).length > 0) {
      await this.usersRepo.update({ id: user.id }, userUpdates as never);
    }

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

    // Geçmiş için kayıt oluştur
    try {
      await this.announcementRepo.save(
        this.announcementRepo.create({
          tenantId: trainer.tenantId,
          createdByUserId: user.id,
          title: data.title.trim(),
          content: `${data.message.trim()} [Push: ${result.sent}/${result.total} ulaştı]`,
          target: 'students',
          recipientCount: result.total,
          pushSent: true,
        }),
      );
    } catch {
      /* log fail - non-critical */
    }

    return { ok: true, sent: result.sent, total: result.total };
  }

  /** PT: kendi gönderdiği push bildirim geçmişi */
  async listPushHistory(user: User) {
    const rows = await this.announcementRepo.find({
      where: { createdByUserId: user.id, target: 'students' as never },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    return rows.map((r) => {
      const pushMatch = r.content.match(/\[Push: (\d+)\/(\d+) ulaştı\]/);
      const sent = pushMatch ? parseInt(pushMatch[1], 10) : r.recipientCount;
      const total = pushMatch ? parseInt(pushMatch[2], 10) : r.recipientCount;
      const cleanContent = r.content.replace(/\s*\[Push:.*?\]/, '');
      return {
        id: r.id,
        title: r.title,
        message: cleanContent,
        target: r.target,
        sent,
        total,
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * PT: birden fazla öğrenciye aynı mesajı tek istek ile gönder.
   * Her öğrenci için sohbet açılır (varsa kullanılır), mesaj ileri.
   * Aynı zamanda gönderim geçmişine kayıt oluşturur.
   */
  async sendBulkMessage(
    user: User,
    data: { studentIds: string[]; content: string },
  ): Promise<{ ok: true; sent: number; failed: number; failedIds: string[] }> {
    if (!data.content?.trim()) {
      throw new BadRequestException('Mesaj boş olamaz');
    }
    if (!Array.isArray(data.studentIds) || data.studentIds.length === 0) {
      throw new BadRequestException('Öğrenci seçmelisiniz');
    }

    const trainer = await this.resolveTrainer(user);
    // Sadece bu eğitmenin aktif öğrencilerine gönderim
    const links = await this.linksRepo.find({
      where: { trainerId: trainer.id, status: 'active' },
      select: ['memberUserId'],
    });
    const allowedIds = new Set(links.map((l) => l.memberUserId));
    const validIds = data.studentIds.filter((id) => allowedIds.has(id));

    let sent = 0;
    const failedIds: string[] = [];

    for (const studentId of validIds) {
      try {
        const conv = await this.messagingService.getOrCreateConversation(user.id, studentId);
        await this.messagingService.sendMessage(user.id, conv.conversationId, data.content.trim(), 'text');
        sent++;
      } catch {
        failedIds.push(studentId);
      }
    }

    // İlgili olmayan id'leri de failed olarak ekle
    for (const id of data.studentIds) {
      if (!allowedIds.has(id)) failedIds.push(id);
    }

    return { ok: true, sent, failed: failedIds.length, failedIds };
  }

  // ─── Hizmetlerim (Resource CRUD) ──────────────────────────────────────────────

  /** PT: kendi hizmetlerini listele */
  async listMyServices(user: User) {
    const trainer = await this.resolveTrainer(user);
    const resources = await this.resourcesRepo.find({
      where: { tenantId: trainer.tenantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      resourceType: r.resourceType,
      durationMinutes: r.durationMinutes,
      price: r.price,
      currency: r.currency,
      capacity: r.capacity,
      active: r.active,
    }));
  }

  /** PT: hizmet oluştur */
  async createService(
    user: User,
    data: { name: string; description?: string; durationMinutes: number; price: number; capacity?: number },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.name?.trim()) throw new BadRequestException('Hizmet adı zorunludur');
    if (!data.price || data.price <= 0) throw new BadRequestException('Fiyat zorunludur');

    const resource = this.resourcesRepo.create({
      tenantId: trainer.tenantId,
      name: data.name.trim(),
      resourceType: 'personal_training',
      description: data.description?.trim() || null,
      durationMinutes: data.durationMinutes || 60,
      price: data.price.toFixed(2),
      capacity: data.capacity || 1,
      active: true,
      sortOrder: 0,
    });
    await this.resourcesRepo.save(resource);
    return { id: resource.id, name: resource.name, price: resource.price };
  }

  /** PT: hizmet güncelle */
  async updateService(
    user: User,
    resourceId: string,
    data: { name?: string; description?: string; durationMinutes?: number; price?: number; capacity?: number; active?: boolean },
  ) {
    const trainer = await this.resolveTrainer(user);
    const resource = await this.resourcesRepo.findOne({
      where: { id: resourceId, tenantId: trainer.tenantId },
    });
    if (!resource) throw new NotFoundException('Hizmet bulunamadı');

    if (data.name !== undefined) resource.name = data.name.trim();
    if (data.description !== undefined) resource.description = data.description?.trim() || null;
    if (data.durationMinutes !== undefined) resource.durationMinutes = data.durationMinutes;
    if (data.price !== undefined) resource.price = data.price.toFixed(2);
    if (data.capacity !== undefined) resource.capacity = data.capacity;
    if (data.active !== undefined) resource.active = data.active;

    await this.resourcesRepo.save(resource);
    return { ok: true };
  }

  /** PT: hizmet sil */
  async deleteService(user: User, resourceId: string) {
    const trainer = await this.resolveTrainer(user);
    const resource = await this.resourcesRepo.findOne({
      where: { id: resourceId, tenantId: trainer.tenantId },
    });
    if (!resource) throw new NotFoundException('Hizmet bulunamadı');
    await this.resourcesRepo.remove(resource);
    return { ok: true };
  }

  // ─── Paketlerim (PackageType CRUD) ────────────────────────────────────────────

  /** PT: kendi paketlerini listele */
  async listMyPackages(user: User) {
    const trainer = await this.resolveTrainer(user);
    const packages = await this.packageTypesRepo.find({
      where: { tenantId: trainer.tenantId },
      order: { createdAt: 'ASC' },
    });
    return packages.map((p) => ({
      id: p.id,
      name: p.name,
      sessionCount: p.sessionCount,
      price: p.price,
      currency: p.currency,
      validityDays: p.validityDays,
      sessionType: p.sessionType,
      active: p.active,
    }));
  }

  /** PT: paket oluştur */
  async createPackage(
    user: User,
    data: { name: string; sessionCount: number; price: number; validityDays: number; sessionType: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.name?.trim()) throw new BadRequestException('Paket adı zorunludur');
    if (!data.price || data.price <= 0) throw new BadRequestException('Fiyat zorunludur');
    if (!data.sessionCount || data.sessionCount <= 0) throw new BadRequestException('Seans sayısı zorunludur');

    const pkg = this.packageTypesRepo.create({
      tenantId: trainer.tenantId,
      name: data.name.trim(),
      sessionCount: data.sessionCount,
      price: data.price.toFixed(2),
      validityDays: data.validityDays || 30,
      sessionType: (data.sessionType || 'personal_training') as SessionType,
      active: true,
    });
    await this.packageTypesRepo.save(pkg);
    return { id: pkg.id, name: pkg.name, price: pkg.price };
  }

  /** PT: paket güncelle */
  async updatePackage(
    user: User,
    packageId: string,
    data: { name?: string; sessionCount?: number; price?: number; validityDays?: number; active?: boolean },
  ) {
    const trainer = await this.resolveTrainer(user);
    const pkg = await this.packageTypesRepo.findOne({
      where: { id: packageId, tenantId: trainer.tenantId },
    });
    if (!pkg) throw new NotFoundException('Paket bulunamadı');

    if (data.name !== undefined) pkg.name = data.name.trim();
    if (data.sessionCount !== undefined) pkg.sessionCount = data.sessionCount;
    if (data.price !== undefined) pkg.price = data.price.toFixed(2);
    if (data.validityDays !== undefined) pkg.validityDays = data.validityDays;
    if (data.active !== undefined) pkg.active = data.active;

    await this.packageTypesRepo.save(pkg);
    return { ok: true };
  }

  /** PT: paket sil */
  async deletePackage(user: User, packageId: string) {
    const trainer = await this.resolveTrainer(user);
    const pkg = await this.packageTypesRepo.findOne({
      where: { id: packageId, tenantId: trainer.tenantId },
    });
    if (!pkg) throw new NotFoundException('Paket bulunamadı');
    await this.packageTypesRepo.remove(pkg);
    return { ok: true };
  }

  // ─── Etkinlik Yönetimi ──────────────────────────────────────────────────────

  async listTrainerEvents(user: User) {
    const events = await this.eventsRepo.find({
      where: { createdByUserId: user.id },
      order: { startsAt: 'DESC' },
      take: 100,
    });
    if (events.length === 0) return [];

    // Her etkinlik için katılımcı sayısı
    const eventIds = events.map((e) => e.id);
    const regCounts = await this.eventRegRepo
      .createQueryBuilder('r')
      .select('r.club_event_id', 'eventId')
      .addSelect('COUNT(*)', 'count')
      .where('r.club_event_id IN (:...eventIds)', { eventIds })
      .groupBy('r.club_event_id')
      .getRawMany<{ eventId: string; count: string }>();

    const countMap = new Map<string, number>();
    for (const row of regCounts) {
      countMap.set(row.eventId, parseInt(row.count, 10));
    }

    return events.map((e) => ({
      ...e,
      registrationCount: countMap.get(e.id) ?? 0,
    }));
  }

  async deleteTrainerEvent(user: User, eventId: string) {
    const event = await this.eventsRepo.findOne({ where: { id: eventId, createdByUserId: user.id } });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    // Katılımcı varsa silme — önce iptal edilmeli
    const regCount = await this.eventRegRepo.count({ where: { clubEventId: eventId } });
    if (regCount > 0) {
      throw new BadRequestException(
        `Bu etkinliğe ${regCount} katılımcı kayıtlı. Önce katılımcılara haber vererek etkinliği iptal etmelisiniz.`,
      );
    }

    await this.eventsRepo.remove(event);
    return { ok: true };
  }

  /** Eğitmen kendi etkinliğini günceller (sadece taslak veya beklemedeyken) */
  async updateTrainerEvent(
    user: User,
    eventId: string,
    data: {
      title?: string;
      description?: string;
      location?: string;
      startsAt?: string;
      endsAt?: string | null;
      capacity?: number;
      category?: string;
      price?: number;
      requirements?: string;
      imageUrl?: string;
    },
  ) {
    const event = await this.eventsRepo.findOne({
      where: { id: eventId, createdByUserId: user.id },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    if (event.status === 'approved' && event.startsAt < new Date()) {
      throw new BadRequestException('Geçmiş onaylanmış etkinlik düzenlenemez');
    }

    if (data.title !== undefined) event.title = data.title.trim();
    if (data.description !== undefined) event.description = data.description?.trim() || null;
    if (data.location !== undefined) event.location = data.location.trim();
    if (data.startsAt !== undefined) event.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined)
      event.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    if (data.capacity !== undefined) event.capacity = data.capacity;
    if (data.category !== undefined) event.category = data.category.trim() || 'general';
    if (data.price !== undefined) event.price = String(data.price);
    if (data.requirements !== undefined)
      event.requirements = data.requirements?.trim() || null;
    if (data.imageUrl !== undefined) event.imageUrl = data.imageUrl?.trim() || null;

    // Onaylanmış etkinlik düzenlenirse tekrar onay sürecine gitmeli
    if (event.status === 'approved' || event.status === 'rejected') {
      event.status = 'pending_approval';
      event.published = false;
    }

    await this.eventsRepo.save(event);
    return event;
  }

  async createTrainerEvent(user: User, data: {
    title: string;
    description?: string;
    location: string;
    startsAt: string;
    endsAt?: string;
    capacity?: number;
    category?: string;
    price?: number;
    requirements?: string;
    imageUrl?: string;
    recurringRule?: { frequency: 'daily' | 'weekly' | 'monthly'; daysOfWeek?: number[]; endDate?: string; interval?: number };
  }) {
    const startsAt = new Date(data.startsAt);
    const endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const event = this.eventsRepo.create({
      tenantId: user.tenantId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      coachName: `${user.firstName} ${user.lastName}`,
      location: data.location.trim(),
      imageUrl: data.imageUrl?.trim() || null,
      startsAt,
      endsAt,
      capacity: data.capacity ?? 20,
      category: data.category?.trim() || 'general',
      requirements: data.requirements?.trim() || null,
      price: data.price != null ? String(data.price) : '0',
      published: false,
      status: 'pending_approval',
      createdByUserId: user.id,
      recurringRule: data.recurringRule || null,
    });

    return this.eventsRepo.save(event);
  }

  // ─── Öğrenci Detay: Ölçümler ────────────────────────────────────────────────

  /** Üyenin ölçüm geçmişini listele */
  async listMeasurements(user: User, memberUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const rows = await this.measurementsRepo.find({
      where: { trainerId: trainer.id, memberUserId },
      order: { measuredAt: 'DESC' },
    });
    return rows.map((m) => ({
      id: m.id,
      measuredAt: m.measuredAt,
      weightKg: m.weightKg,
      heightCm: m.heightCm,
      bodyFatPct: m.bodyFatPct,
      muscleMassKg: m.muscleMassKg,
      waistCm: m.waistCm,
      hipCm: m.hipCm,
      chestCm: m.chestCm,
      bicepsLeftCm: m.bicepsLeftCm,
      bicepsRightCm: m.bicepsRightCm,
      thighLeftCm: m.thighLeftCm,
      thighRightCm: m.thighRightCm,
      calfLeftCm: m.calfLeftCm,
      calfRightCm: m.calfRightCm,
      notes: m.notes,
    }));
  }

  /** Yeni ölçüm ekle */
  async addMeasurement(
    user: User,
    memberUserId: string,
    data: Partial<Omit<TrainerMemberMeasurement, 'id' | 'tenantId' | 'trainerId' | 'memberUserId' | 'createdAt' | 'tenant' | 'trainer' | 'memberUser'>>,
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.measuredAt) throw new BadRequestException('Tarih zorunlu');
    const m = this.measurementsRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId,
      ...data,
    });
    await this.measurementsRepo.save(m);
    return { id: m.id, ok: true };
  }

  /** Ölçüm güncelle */
  async updateMeasurement(
    user: User,
    measurementId: string,
    data: Partial<Omit<TrainerMemberMeasurement, 'id' | 'tenantId' | 'trainerId' | 'memberUserId' | 'createdAt' | 'tenant' | 'trainer' | 'memberUser'>>,
  ) {
    const trainer = await this.resolveTrainer(user);
    const m = await this.measurementsRepo.findOne({
      where: { id: measurementId, trainerId: trainer.id },
    });
    if (!m) throw new NotFoundException('Ölçüm bulunamadı');
    Object.assign(m, data);
    await this.measurementsRepo.save(m);
    return { ok: true };
  }

  /** Ölçüm sil */
  async deleteMeasurement(user: User, measurementId: string) {
    const trainer = await this.resolveTrainer(user);
    const m = await this.measurementsRepo.findOne({
      where: { id: measurementId, trainerId: trainer.id },
    });
    if (!m) throw new NotFoundException('Ölçüm bulunamadı');
    await this.measurementsRepo.remove(m);
    return { ok: true };
  }

  // ─── Öğrenci Detay: Değerlendirmeler (FMS, Postür, VO2 Max) ─────────────────

  async listAssessments(user: User, memberUserId: string, type?: AssessmentType) {
    const trainer = await this.resolveTrainer(user);
    const where: Record<string, unknown> = { trainerId: trainer.id, memberUserId };
    if (type) where.type = type;
    const rows = await this.assessmentsRepo.find({
      where,
      order: { assessedAt: 'DESC' },
    });
    return rows.map((a) => ({
      id: a.id,
      assessedAt: a.assessedAt,
      type: a.type,
      data: a.data,
      notes: a.notes,
      createdAt: a.createdAt,
    }));
  }

  async addAssessment(
    user: User,
    memberUserId: string,
    data: { type: AssessmentType; assessedAt: string; data: Record<string, unknown>; notes?: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.type || !data.assessedAt) {
      throw new BadRequestException('Tip ve tarih zorunlu');
    }
    const a = this.assessmentsRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId,
      type: data.type,
      assessedAt: data.assessedAt,
      data: data.data ?? {},
      notes: data.notes ?? null,
    });
    await this.assessmentsRepo.save(a);
    return { id: a.id, ok: true };
  }

  async updateAssessment(
    user: User,
    assessmentId: string,
    data: { assessedAt?: string; data?: Record<string, unknown>; notes?: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    const a = await this.assessmentsRepo.findOne({
      where: { id: assessmentId, trainerId: trainer.id },
    });
    if (!a) throw new NotFoundException('Değerlendirme bulunamadı');
    if (data.assessedAt !== undefined) a.assessedAt = data.assessedAt;
    if (data.data !== undefined) a.data = data.data;
    if (data.notes !== undefined) a.notes = data.notes;
    await this.assessmentsRepo.save(a);
    return { ok: true };
  }

  async deleteAssessment(user: User, assessmentId: string) {
    const trainer = await this.resolveTrainer(user);
    const a = await this.assessmentsRepo.findOne({
      where: { id: assessmentId, trainerId: trainer.id },
    });
    if (!a) throw new NotFoundException('Değerlendirme bulunamadı');
    await this.assessmentsRepo.remove(a);
    return { ok: true };
  }

  // ─── Öğrenci Detay: Fotoğraflar (timeline) ──────────────────────────────────

  async listMemberPhotos(user: User, memberUserId: string) {
    const trainer = await this.resolveTrainer(user);
    const rows = await this.photosRepo.find({
      where: { trainerId: trainer.id, memberUserId },
      order: { takenAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((p) => ({
      id: p.id,
      takenAt: p.takenAt,
      photoUrl: p.photoUrl,
      tag: p.tag,
      notes: p.notes,
    }));
  }

  async addMemberPhoto(
    user: User,
    memberUserId: string,
    data: { takenAt: string; photoUrl: string; tag?: string; notes?: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.photoUrl) throw new BadRequestException('Fotoğraf URL zorunlu');
    const p = this.photosRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId,
      takenAt: data.takenAt || new Date().toISOString().slice(0, 10),
      photoUrl: data.photoUrl,
      tag: data.tag ?? null,
      notes: data.notes ?? null,
    });
    await this.photosRepo.save(p);
    return { id: p.id, ok: true };
  }

  async deleteMemberPhoto(user: User, photoId: string) {
    const trainer = await this.resolveTrainer(user);
    const p = await this.photosRepo.findOne({
      where: { id: photoId, trainerId: trainer.id },
    });
    if (!p) throw new NotFoundException('Fotoğraf bulunamadı');
    await this.photosRepo.remove(p);
    return { ok: true };
  }

  // ─── Öğrenci Detay: Hedefler ────────────────────────────────────────────────

  async listGoals(user: User, memberUserId: string, status?: GoalStatus) {
    const trainer = await this.resolveTrainer(user);
    const where: Record<string, unknown> = { trainerId: trainer.id, memberUserId };
    if (status) where.status = status;
    const rows = await this.goalsRepo.find({
      where,
      order: { status: 'ASC', startDate: 'DESC' },
    });
    return rows.map((g) => {
      const start = g.startValue ? parseFloat(g.startValue) : null;
      const current = g.currentValue ? parseFloat(g.currentValue) : null;
      const target = g.targetValue ? parseFloat(g.targetValue) : null;
      let progressPct: number | null = null;
      if (start !== null && current !== null && target !== null && start !== target) {
        progressPct = Math.max(
          0,
          Math.min(100, ((current - start) / (target - start)) * 100),
        );
      }
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        targetValue: g.targetValue,
        targetUnit: g.targetUnit,
        startValue: g.startValue,
        currentValue: g.currentValue,
        startDate: g.startDate,
        targetDate: g.targetDate,
        completedAt: g.completedAt,
        status: g.status,
        progressPct,
        createdAt: g.createdAt,
      };
    });
  }

  async addGoal(
    user: User,
    memberUserId: string,
    data: {
      title: string;
      description?: string;
      category?: GoalCategory;
      targetValue?: number;
      targetUnit?: string;
      startValue?: number;
      currentValue?: number;
      startDate: string;
      targetDate?: string;
    },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.title?.trim()) throw new BadRequestException('Başlık zorunlu');
    const g = this.goalsRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId,
      title: data.title.trim(),
      description: data.description?.trim() ?? null,
      category: data.category ?? 'general',
      targetValue: data.targetValue != null ? String(data.targetValue) : null,
      targetUnit: data.targetUnit ?? null,
      startValue: data.startValue != null ? String(data.startValue) : null,
      currentValue:
        data.currentValue != null
          ? String(data.currentValue)
          : data.startValue != null
            ? String(data.startValue)
            : null,
      startDate: data.startDate,
      targetDate: data.targetDate ?? null,
      status: 'active',
    });
    await this.goalsRepo.save(g);
    return { id: g.id, ok: true };
  }

  async updateGoal(
    user: User,
    goalId: string,
    data: {
      title?: string;
      description?: string;
      category?: GoalCategory;
      targetValue?: number;
      targetUnit?: string;
      currentValue?: number;
      targetDate?: string;
      status?: GoalStatus;
    },
  ) {
    const trainer = await this.resolveTrainer(user);
    const g = await this.goalsRepo.findOne({
      where: { id: goalId, trainerId: trainer.id },
    });
    if (!g) throw new NotFoundException('Hedef bulunamadı');
    if (data.title !== undefined) g.title = data.title.trim();
    if (data.description !== undefined) g.description = data.description.trim() || null;
    if (data.category !== undefined) g.category = data.category;
    if (data.targetValue !== undefined) g.targetValue = String(data.targetValue);
    if (data.targetUnit !== undefined) g.targetUnit = data.targetUnit;
    if (data.currentValue !== undefined) g.currentValue = String(data.currentValue);
    if (data.targetDate !== undefined) g.targetDate = data.targetDate;
    if (data.status !== undefined) {
      g.status = data.status;
      if (data.status === 'completed' && !g.completedAt) {
        g.completedAt = new Date().toISOString().slice(0, 10);
      }
      if (data.status === 'active') g.completedAt = null;
    }
    await this.goalsRepo.save(g);
    return { ok: true };
  }

  async deleteGoal(user: User, goalId: string) {
    const trainer = await this.resolveTrainer(user);
    const g = await this.goalsRepo.findOne({
      where: { id: goalId, trainerId: trainer.id },
    });
    if (!g) throw new NotFoundException('Hedef bulunamadı');
    await this.goalsRepo.remove(g);
    return { ok: true };
  }

  // ─── Paket Satışı (Eğitmen → Öğrenci) ──────────────────────────────────────

  /**
   * Eğitmenin kendi paketini öğrencisine atar.
   * - Üyeye yeni Package kaydı oluşturulur
   * - assignedTrainerId = eğitmenin id'si
   * - PaymentTransaction kaydı oluşturulabilir (gelir takibi için)
   * - Üyeye bildirim gönderilir
   */
  async sellPackageToStudent(
    user: User,
    data: { studentUserId: string; packageTypeId: string; notes?: string },
  ) {
    const trainer = await this.resolveTrainer(user);
    if (!data.studentUserId || !data.packageTypeId) {
      throw new BadRequestException('Öğrenci ve paket zorunlu');
    }

    // Üye doğrula (tenant'ta olmalı)
    const member = await this.usersRepo.findOne({
      where: { id: data.studentUserId, tenantId: trainer.tenantId },
    });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    // Paket tipi (eğitmenin kendi paketi olabilir veya kulüp paketi)
    const pt = await this.packageTypesRepo.findOne({
      where: { id: data.packageTypeId, tenantId: trainer.tenantId, active: true },
    });
    if (!pt) throw new NotFoundException('Paket bulunamadı');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pt.validityDays);

    const pkg = this.packagesRepo.create({
      userId: data.studentUserId,
      packageTypeId: pt.id,
      remainingSessions: pt.sessionCount,
      expiresAt: expiresAt.toISOString().slice(0, 10),
      assignedTrainerId: trainer.id,
      status: 'active' as never,
    });
    await this.packagesRepo.save(pkg);

    // Otomatik link
    const existingLink = await this.linksRepo.findOne({
      where: { trainerId: trainer.id, memberUserId: data.studentUserId },
    });
    if (!existingLink) {
      const link = this.linksRepo.create({
        tenantId: trainer.tenantId,
        trainerId: trainer.id,
        memberUserId: data.studentUserId,
        status: 'active',
        source: 'trainer_added',
      });
      await this.linksRepo.save(link);
    } else if (existingLink.status === 'archived') {
      existingLink.status = 'active';
      await this.linksRepo.save(existingLink);
    }

    // Üyeye bildirim
    if (this.notifier && typeof this.notifier.packageAssignedToMember === 'function') {
      void this.notifier.packageAssignedToMember(member, pt.name).catch(() => {});
    }

    return {
      ok: true,
      packageId: pkg.id,
      packageName: pt.name,
      sessionCount: pt.sessionCount,
      price: pt.price,
      expiresAt: expiresAt.toISOString().slice(0, 10),
    };
  }
}
