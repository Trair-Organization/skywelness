import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { MailService } from '../mail/mail.service';
import { emailShell, escapeHtml } from '../mail/mail-templates';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

const CLUB_NAME = 'Skyland Wellness Club';
const TICKET_BASE = 'https://www.wellnessclub.tech/api/v1/ticket';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly push: PushService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  // ─── ÜYE ONAYLANDI ────────────────────────────────────────────────────────────

  async memberApproved(user: User) {
    const title = 'Üyeliğiniz Onaylandı';
    const body = `Merhaba ${user.firstName}, ${CLUB_NAME} üyeliğiniz onaylandı!`;

    await this.push.sendToUser(user.id, `✅ ${title}`, body);
    if (user.phone) await this.sms.sendMemberApproved(user.phone, user.firstName);

    // Mail
    const html = emailShell({
      title,
      previewText: `${CLUB_NAME} üyeliğiniz onaylandı`,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(user.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">${CLUB_NAME} ailesine hoş geldiniz! Üyeliğiniz başarıyla onaylanmıştır.</p>
<div style="margin:20px 0;padding:18px;background:rgba(34,197,94,0.1);border-radius:12px;border:1px solid rgba(34,197,94,0.3);">
  <p style="margin:0;font-weight:700;color:#22c55e;">✅ Hesabınız Aktif</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;">Artık randevu alabilir, etkinliklere katılabilir ve spa hizmetlerimizden yararlanabilirsiniz.</p>
</div>
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Sorularınız için bize ulaşmaktan çekinmeyin.</p>`,
    });
    await this.mail['send']({
      to: [user.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Mail failed: ' + String(e)));
    this.logger.log(`[NOTIFY] memberApproved → ${user.email}`);
  }

  // ─── RANDEVU OLUŞTURULDU ──────────────────────────────────────────────────────

  async reservationCreatedForMember(params: {
    member: User;
    trainerName: string;
    date: string;
    time: string;
    sessionType: string;
    reservationId?: string;
  }) {
    const typeLabel = params.sessionType === 'personal_training' ? 'Personal Training' : 'Masaj';
    const title = 'Randevunuz Oluşturuldu';
    const body = `${params.date} ${params.time} — ${params.trainerName} (${typeLabel})`;
    const ticketLink = params.reservationId ? `${TICKET_BASE}/${params.reservationId}` : '';

    await this.push.sendToUser(params.member.id, `📅 ${title}`, body);
    if (params.member.phone)
      await this.sms.sendReservationConfirmed(
        params.member.phone,
        params.trainerName,
        params.date,
        params.time,
        params.reservationId,
      );

    // Mail
    const ticketBtn = ticketLink
      ? `<a href="${ticketLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">🎫 Randevu Biletini Görüntüle</a>`
      : '';
    const html = emailShell({
      title,
      previewText: `${params.date} ${params.time} — ${params.trainerName}`,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.member.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Randevunuz başarıyla oluşturulmuştur.</p>
<div style="margin:20px 0;padding:18px;background:rgba(59,130,246,0.1);border-radius:12px;border:1px solid rgba(59,130,246,0.3);">
  <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">${escapeHtml(typeLabel)}</p>
  <p style="margin:0 0 4px;font-weight:700;color:#1f2937;font-size:16px;">🏋️ ${escapeHtml(params.trainerName)}</p>
  <p style="margin:8px 0 0;color:#6b7280;">📅 ${escapeHtml(params.date)}</p>
  <p style="margin:4px 0 0;color:#d97706;font-weight:700;font-size:18px;">🕐 ${escapeHtml(params.time)}</p>
</div>
${ticketBtn}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Lütfen randevu saatinden 10 dakika önce kulüpte olunuz.</p>`,
    });
    await this.mail['send']({
      to: [params.member.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Mail failed: ' + String(e)));
    this.logger.log(`[NOTIFY] reservationCreated → ${params.member.email}`);
  }

  // ─── RANDEVU İPTAL ────────────────────────────────────────────────────────────

  async reservationCancelledForMember(params: {
    member: User;
    trainerName: string;
    date: string;
    time: string;
  }) {
    const title = 'Randevunuz İptal Edildi';
    const body = `${params.date} ${params.time} randevunuz iptal edildi.`;

    await this.push.sendToUser(params.member.id, `❌ ${title}`, body);
    if (params.member.phone)
      await this.sms.sendReservationCancelled(params.member.phone, params.date, params.time);

    // Mail
    const html = emailShell({
      title,
      previewText: `Randevunuz iptal edildi — ${params.date}`,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.member.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Aşağıdaki randevunuz iptal edilmiştir.</p>
<div style="margin:20px 0;padding:18px;background:rgba(239,68,68,0.1);border-radius:12px;border:1px solid rgba(239,68,68,0.3);">
  <p style="margin:0;font-weight:700;color:#ef4444;">❌ İptal Edildi</p>
  <p style="margin:8px 0 0;color:#374151;">📅 ${escapeHtml(params.date)} · 🕐 ${escapeHtml(params.time)}</p>
  ${params.trainerName ? `<p style="margin:4px 0 0;color:#6b7280;">🏋️ ${escapeHtml(params.trainerName)}</p>` : ''}
</div>
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Yeni randevu almak için uygulamamızı kullanabilirsiniz.</p>`,
    });
    await this.mail['send']({
      to: [params.member.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Mail failed: ' + String(e)));
    this.logger.log(`[NOTIFY] reservationCancelled → ${params.member.email}`);
  }

  // ─── RANDEVU GÜNCELLENDİ ─────────────────────────────────────────────────────

  async reservationRescheduledForMember(params: {
    member: User;
    trainerName: string;
    newDate: string;
    newTime: string;
    reservationId?: string;
  }) {
    const title = 'Randevunuz Güncellendi';
    const body = `Yeni tarih: ${params.newDate} ${params.newTime}`;
    const ticketLink = params.reservationId ? `${TICKET_BASE}/${params.reservationId}` : '';

    await this.push.sendToUser(params.member.id, `🔄 ${title}`, body);
    if (params.member.phone)
      await this.sms.sendReservationRescheduled(
        params.member.phone,
        params.newDate,
        params.newTime,
        params.trainerName,
        params.reservationId,
      );

    // Mail
    const ticketBtn = ticketLink
      ? `<a href="${ticketLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">🎫 Güncel Bileti Görüntüle</a>`
      : '';
    const html = emailShell({
      title,
      previewText: `Randevunuz güncellendi — ${params.newDate} ${params.newTime}`,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.member.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Randevunuz yeni bir tarihe taşınmıştır.</p>
<div style="margin:20px 0;padding:18px;background:rgba(245,158,11,0.1);border-radius:12px;border:1px solid rgba(245,158,11,0.3);">
  <p style="margin:0 0 8px;font-weight:700;color:#f59e0b;">🔄 Güncellendi</p>
  <p style="margin:0;color:#1f2937;font-size:16px;font-weight:700;">📅 ${escapeHtml(params.newDate)} · 🕐 ${escapeHtml(params.newTime)}</p>
  ${params.trainerName ? `<p style="margin:8px 0 0;color:#6b7280;">🏋️ ${escapeHtml(params.trainerName)}</p>` : ''}
</div>
${ticketBtn}`,
    });
    await this.mail['send']({
      to: [params.member.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Mail failed: ' + String(e)));
    this.logger.log(`[NOTIFY] reservationRescheduled → ${params.member.email}`);
  }

  // ─── PAKET ATANDI ─────────────────────────────────────────────────────────────

  async packageAssignedToMember(member: User, packageName: string) {
    const title = 'Yeni Paket Tanımlandı';
    const body = `${packageName} paketiniz tanımlanmıştır.`;

    await this.push.sendToUser(member.id, `📦 ${title}`, body);
    if (member.phone) await this.sms.sendPackageAssigned(member.phone, packageName);

    // Mail
    const html = emailShell({
      title,
      previewText: `${packageName} paketiniz tanımlandı`,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(member.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Yeni bir paket hesabınıza tanımlanmıştır.</p>
<div style="margin:20px 0;padding:18px;background:rgba(34,197,94,0.1);border-radius:12px;border:1px solid rgba(34,197,94,0.3);">
  <p style="margin:0;font-weight:700;color:#22c55e;font-size:16px;">📦 ${escapeHtml(packageName)}</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;">Paketiniz aktif edilmiştir. Randevu alarak seanslarınıza başlayabilirsiniz.</p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">İyi seanslar dileriz!</p>`,
    });
    await this.mail['send']({
      to: [member.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Mail failed: ' + String(e)));
    this.logger.log(`[NOTIFY] packageAssigned → ${member.email}`);
  }

  // ─── EĞİTMEN BİLDİRİMLERİ ────────────────────────────────────────────────────

  async newBookingForTrainer(params: {
    trainerUserId: string;
    trainerPhone: string | null;
    memberName: string;
    date: string;
    time: string;
  }) {
    const title = '📅 Yeni Randevu';
    const body = `${params.memberName} — ${params.date} ${params.time}`;
    await this.push.sendToUser(params.trainerUserId, title, body);
    if (params.trainerPhone)
      await this.sms.sendNewBookingNotification(
        params.trainerPhone,
        params.memberName,
        params.date,
        params.time,
      );
    this.logger.log(`[NOTIFY] newBooking → trainer ${params.trainerUserId}`);
  }

  async bookingCancelledForTrainer(params: {
    trainerUserId: string;
    memberName: string;
    date: string;
    time: string;
  }) {
    await this.push.sendToUser(
      params.trainerUserId,
      '❌ Randevu İptal',
      `${params.memberName} — ${params.date} ${params.time} iptal.`,
    );
    this.logger.log(`[NOTIFY] bookingCancelled → trainer ${params.trainerUserId}`);
  }

  // ─── KULÜP SAHİBİ BİLDİRİMLERİ ───────────────────────────────────────────────

  async newMemberRegistration(tenantId: string, memberName: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '👤 Yeni Üye', `${memberName} başvuru yaptı.`);
  }

  async newBookingForClub(
    tenantId: string,
    memberName: string,
    trainerName: string,
    date: string,
    time: string,
  ) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(
        a.id,
        '📅 Yeni Randevu',
        `${memberName} → ${trainerName} ${date} ${time}`,
      );
  }

  async bookingCancelledForClub(tenantId: string, memberName: string, date: string, time: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '❌ İptal', `${memberName} ${date} ${time}`);
  }

  async spaBookingRequest(tenantId: string, memberName: string, serviceName: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '🧖 Spa Talebi', `${memberName} — ${serviceName}`);
  }

  async eventJoined(tenantId: string, memberName: string, eventTitle: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '📅 Katılım', `${memberName} — ${eventTitle}`);
  }

  // ─── HATIRLATMA (T-24 ve T-2 saat) ───────────────────────────────────────────

  async reservationReminder(params: {
    member: User;
    providerName: string; // eğitmen veya masöz adı
    sessionType: 'personal_training' | 'massage';
    date: string; // "10.05.2026"
    time: string; // "14:00"
    reservationId?: string;
    window: 'day' | 'hour'; // T-24 veya T-2 saat
  }) {
    const typeLabel = params.sessionType === 'personal_training' ? 'Personal Training' : 'Masaj';
    const when = params.window === 'day' ? 'Yarın' : 'Yaklaşan randevu';
    const title = `⏰ ${when}: ${params.time}`;
    const body = `${params.date} ${params.time} — ${params.providerName} (${typeLabel})`;
    const ticketLink = params.reservationId ? `${TICKET_BASE}/${params.reservationId}` : '';

    await this.push.sendToUser(params.member.id, title, body);

    // SMS sadece T-24 için (T-2'de push yeterli, maliyet optimizasyonu)
    if (params.window === 'day' && params.member.phone) {
      await this.sms
        .sendReservationReminder(
          params.member.phone,
          params.date,
          params.time,
          params.providerName,
          params.reservationId,
        )
        .catch((e: unknown) => this.logger.error('Reminder SMS failed: ' + String(e)));
    }

    // Mail sadece T-24 için
    if (params.window === 'day') {
      const ticketBtn = ticketLink
        ? `<a href="${ticketLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">🎫 Randevu Biletini Görüntüle</a>`
        : '';
      const html = emailShell({
        title: 'Yarınki Randevunuz',
        previewText: `${params.date} ${params.time} — ${params.providerName}`,
        clubName: CLUB_NAME,
        innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.member.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Yarın için bir randevunuz olduğunu hatırlatmak istedik.</p>
<div style="margin:20px 0;padding:18px;background:rgba(59,130,246,0.1);border-radius:12px;border:1px solid rgba(59,130,246,0.3);">
  <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">${escapeHtml(typeLabel)}</p>
  <p style="margin:0 0 4px;font-weight:700;color:#1f2937;font-size:16px;">🏋️ ${escapeHtml(params.providerName)}</p>
  <p style="margin:8px 0 0;color:#6b7280;">📅 ${escapeHtml(params.date)}</p>
  <p style="margin:4px 0 0;color:#d97706;font-weight:700;font-size:18px;">🕐 ${escapeHtml(params.time)}</p>
</div>
${ticketBtn}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Gelemeyecekseniz lütfen en kısa sürede bizi bilgilendirin.</p>`,
      });
      await this.mail['send']({
        to: [params.member.email],
        subject: `${CLUB_NAME} — Yarınki Randevunuz`,
        html,
        text: body,
      }).catch((e: unknown) => this.logger.error('Reminder mail failed: ' + String(e)));
    }

    this.logger.log(`[NOTIFY] reminder (${params.window}) → ${params.member.email}`);
  }

  // ─── EĞİTMEN: DERS HATIRLATMA (T-1h) ──────────────────────────────────────

  async trainerLessonReminder(params: {
    trainer: { id: string; firstName: string; lastName: string };
    trainerPhone?: string | null;
    studentName: string;
    date: string;
    time: string;
    reservationId: string;
  }) {
    const title = '⏰ 1 Saat Sonra Dersiniz Var';
    const body = `${params.studentName} ile ${params.time} dersiniz başlayacak.`;
    await this.push.sendToUser(params.trainer.id, title, body, {
      type: 'trainer_lesson_reminder',
      reservationId: params.reservationId,
    });
    // SMS to trainer
    if (params.trainerPhone) {
      const smsMsg = `1 saat sonra dersiniz var: ${params.studentName} - ${params.date} ${params.time}. Wellness Club`;
      await this.sms.send(params.trainerPhone, smsMsg).catch(() => {});
    }
    this.logger.log(`[NOTIFY] trainerLessonReminder → ${params.trainer.id}`);
  }

  // ─── EĞİTMEN: GÜNLÜK ÖZET (08:00) ─────────────────────────────────────────

  async trainerDailySummary(params: {
    trainer: { id: string; firstName: string; lastName: string };
    trainerEmail?: string | null;
    lessonCount: number;
    firstLessonTime: string;
    schedule?: Array<{ time: string; studentName: string }>;
  }) {
    const title = '📋 Bugünkü Programınız';
    const body = `Bugün ${params.lessonCount} dersiniz var. İlk ders: ${params.firstLessonTime}`;
    await this.push.sendToUser(params.trainer.id, title, body, {
      type: 'trainer_daily_summary',
    });
    // Mail to trainer (detailed schedule)
    if (params.trainerEmail) {
      const scheduleHtml = (params.schedule ?? [])
        .map((s) => `<li><strong>${s.time}</strong> — ${s.studentName}</li>`)
        .join('');
      const html = emailShell({
        title,
        previewText: body,
        clubName: CLUB_NAME,
        innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.trainer.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Bugün <strong>${params.lessonCount}</strong> dersiniz var.</p>
<div style="margin:20px 0;padding:18px;background:rgba(56,189,248,0.08);border-radius:12px;border:1px solid rgba(56,189,248,0.2);">
  <p style="margin:0 0 8px;font-weight:700;color:#38bdf8;">📅 Günlük Program</p>
  <ul style="margin:0;padding-left:20px;color:#1f2937;">${scheduleHtml || '<li>Detay yok</li>'}</ul>
</div>
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">İlk ders: ${escapeHtml(params.firstLessonTime)}</p>`,
      });
      await this.mail['send']({
        to: [params.trainerEmail],
        subject: `${CLUB_NAME} — ${title}`,
        html,
        text: body,
      }).catch((e: unknown) => this.logger.error('Trainer daily mail failed: ' + String(e)));
    }
    this.logger.log(
      `[NOTIFY] trainerDailySummary → ${params.trainer.id} (${params.lessonCount} ders)`,
    );
  }

  // ─── EĞİTMEN: YENİ ÖĞRENCİ BAĞLANDI ──────────────────────────────────────

  async trainerNewStudent(params: {
    trainer: { id: string; firstName: string };
    trainerPhone?: string | null;
    studentName: string;
  }) {
    const title = '👥 Yeni Öğrenci';
    const body = `${params.studentName} size bağlandı.`;
    await this.push.sendToUser(params.trainer.id, title, body, { type: 'new_student' });
    if (params.trainerPhone) {
      await this.sms
        .send(
          params.trainerPhone,
          `Yeni ogrenci: ${params.studentName} size baglandi. Wellness Club`,
        )
        .catch(() => {});
    }
    this.logger.log(`[NOTIFY] trainerNewStudent → ${params.trainer.id}`);
  }

  // ─── ÖĞRENCİYE: DERS OLUŞTURULDU (eğitmen tarafından) ─────────────────────

  async studentLessonCreated(params: {
    student: { id: string; firstName: string; email: string; phone?: string | null };
    trainerName: string;
    date: string;
    time: string;
  }) {
    const title = '📅 Yeni Ders Planlandı';
    const body = `${params.trainerName} ${params.date} ${params.time} tarihinde ders planladı.`;
    await this.push.sendToUser(params.student.id, title, body, { type: 'lesson_created' });
    // SMS
    if (params.student.phone) {
      await this.sms
        .send(
          params.student.phone,
          `Yeni ders: ${params.trainerName} - ${params.date} ${params.time}. Wellness Club`,
        )
        .catch(() => {});
    }
    // Mail
    const html = emailShell({
      title,
      previewText: body,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.student.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Eğitmeniniz yeni bir ders planladı.</p>
<div style="margin:20px 0;padding:18px;background:rgba(34,197,94,0.08);border-radius:12px;border:1px solid rgba(34,197,94,0.2);">
  <p style="margin:0;font-weight:700;color:#22c55e;">✅ Ders Onaylandı</p>
  <p style="margin:8px 0 0;color:#1f2937;font-size:16px;font-weight:700;">📅 ${escapeHtml(params.date)} · 🕐 ${escapeHtml(params.time)}</p>
  <p style="margin:8px 0 0;color:#6b7280;">🏋️ ${escapeHtml(params.trainerName)}</p>
</div>`,
    });
    await this.mail['send']({
      to: [params.student.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Student lesson mail: ' + String(e)));
    this.logger.log(`[NOTIFY] studentLessonCreated → ${params.student.id}`);
  }

  // ─── ÖĞRENCİYE: DERS İPTAL EDİLDİ (eğitmen tarafından) ────────────────────

  async studentLessonCancelled(params: {
    student: { id: string; firstName: string; email: string; phone?: string | null };
    trainerName: string;
    date: string;
    time: string;
    reason?: string | null;
  }) {
    const title = '❌ Ders İptal Edildi';
    const body = params.reason
      ? `${params.trainerName} dersinizi iptal etti. Sebep: ${params.reason}`
      : `${params.trainerName} dersinizi iptal etti.`;
    await this.push.sendToUser(params.student.id, title, body, { type: 'lesson_cancelled' });
    // SMS
    if (params.student.phone) {
      await this.sms
        .send(
          params.student.phone,
          `Ders iptal: ${params.date} ${params.time} dersiniz iptal edildi. ${params.trainerName}. Wellness Club`,
        )
        .catch(() => {});
    }
    // Mail
    const html = emailShell({
      title,
      previewText: body,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.student.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Eğitmeniniz dersinizi iptal etti.</p>
<div style="margin:20px 0;padding:18px;background:rgba(239,68,68,0.08);border-radius:12px;border:1px solid rgba(239,68,68,0.2);">
  <p style="margin:0;font-weight:700;color:#ef4444;">❌ İptal Edildi</p>
  <p style="margin:8px 0 0;color:#1f2937;font-size:16px;font-weight:700;">📅 ${escapeHtml(params.date)} · 🕐 ${escapeHtml(params.time)}</p>
  <p style="margin:8px 0 0;color:#6b7280;">🏋️ ${escapeHtml(params.trainerName)}</p>
  ${params.reason ? `<p style="margin:8px 0 0;color:#6b7280;">Sebep: ${escapeHtml(params.reason)}</p>` : ''}
</div>`,
    });
    await this.mail['send']({
      to: [params.student.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Student cancel mail: ' + String(e)));
    this.logger.log(`[NOTIFY] studentLessonCancelled → ${params.student.id}`);
  }

  // ─── ÖĞRENCİYE: DERS HATIRLATMA (manuel) ──────────────────────────────────

  async studentLessonReminder(params: {
    student: { id: string; firstName: string; email: string; phone?: string | null };
    trainerName: string;
    date: string;
    time: string;
  }) {
    const title = '🔔 Ders Hatırlatması';
    const body = `${params.trainerName} ile ${params.date} ${params.time} dersiniz var.`;
    await this.push.sendToUser(params.student.id, title, body, { type: 'lesson_reminder' });
    if (params.student.phone) {
      await this.sms
        .send(
          params.student.phone,
          `Ders hatırlatma: ${params.date} ${params.time} ${params.trainerName} dersiniz var. Wellness Club`,
        )
        .catch(() => {});
    }
    this.logger.log(`[NOTIFY] studentLessonReminder → ${params.student.id}`);
  }

  // ─── ÖĞRENCİYE: DERS ERTELENDİ (eğitmen tarafından) ───────────────────────

  async studentLessonRescheduled(params: {
    student: { id: string; firstName: string; email: string; phone?: string | null };
    trainerName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
  }) {
    const title = '📅 Ders Tarihi Değişti';
    const body = `Dersiniz ${params.newDate} ${params.newTime} tarihine taşındı.`;
    await this.push.sendToUser(params.student.id, title, body, { type: 'lesson_rescheduled' });
    // SMS
    if (params.student.phone) {
      await this.sms
        .send(
          params.student.phone,
          `Ders degisikligi: ${params.oldDate} ${params.oldTime} → ${params.newDate} ${params.newTime}. ${params.trainerName}. Wellness Club`,
        )
        .catch(() => {});
    }
    // Mail
    const html = emailShell({
      title,
      previewText: body,
      clubName: CLUB_NAME,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(params.student.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Eğitmeniniz dersinizi yeni bir tarihe taşıdı.</p>
<div style="margin:20px 0;padding:18px;background:rgba(245,158,11,0.08);border-radius:12px;border:1px solid rgba(245,158,11,0.2);">
  <p style="margin:0;font-weight:700;color:#f59e0b;">🔄 Tarih Değişikliği</p>
  <p style="margin:8px 0 0;color:#6b7280;text-decoration:line-through;">${escapeHtml(params.oldDate)} ${escapeHtml(params.oldTime)}</p>
  <p style="margin:4px 0 0;color:#1f2937;font-size:16px;font-weight:700;">📅 ${escapeHtml(params.newDate)} · 🕐 ${escapeHtml(params.newTime)}</p>
  <p style="margin:8px 0 0;color:#6b7280;">🏋️ ${escapeHtml(params.trainerName)}</p>
</div>`,
    });
    await this.mail['send']({
      to: [params.student.email],
      subject: `${CLUB_NAME} — ${title}`,
      html,
      text: body,
    }).catch((e: unknown) => this.logger.error('Student reschedule mail: ' + String(e)));
    this.logger.log(`[NOTIFY] studentLessonRescheduled → ${params.student.id}`);
  }
}
