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
  <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Artık randevu alabilir, etkinliklere katılabilir ve spa hizmetlerimizden yararlanabilirsiniz.</p>
</div>
<p style="margin:16px 0 0;font-size:14px;color:#94a3b8;">Sorularınız için bize ulaşmaktan çekinmeyin.</p>`,
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
  <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">${escapeHtml(typeLabel)}</p>
  <p style="margin:0 0 4px;font-weight:700;color:#f8fafc;font-size:16px;">🏋️ ${escapeHtml(params.trainerName)}</p>
  <p style="margin:8px 0 0;color:#cbd5e1;">📅 ${escapeHtml(params.date)}</p>
  <p style="margin:4px 0 0;color:#fbbf24;font-weight:700;font-size:18px;">🕐 ${escapeHtml(params.time)}</p>
</div>
${ticketBtn}
<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Lütfen randevu saatinden 10 dakika önce kulüpte olunuz.</p>`,
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
  <p style="margin:8px 0 0;color:#e2e8f0;">📅 ${escapeHtml(params.date)} · 🕐 ${escapeHtml(params.time)}</p>
  ${params.trainerName ? `<p style="margin:4px 0 0;color:#cbd5e1;">🏋️ ${escapeHtml(params.trainerName)}</p>` : ''}
</div>
<p style="margin:16px 0 0;font-size:14px;color:#94a3b8;">Yeni randevu almak için uygulamamızı kullanabilirsiniz.</p>`,
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
  <p style="margin:0;color:#f8fafc;font-size:16px;font-weight:700;">📅 ${escapeHtml(params.newDate)} · 🕐 ${escapeHtml(params.newTime)}</p>
  ${params.trainerName ? `<p style="margin:8px 0 0;color:#cbd5e1;">🏋️ ${escapeHtml(params.trainerName)}</p>` : ''}
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
  <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Paketiniz aktif edilmiştir. Randevu alarak seanslarınıza başlayabilirsiniz.</p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">İyi seanslar dileriz!</p>`,
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
}
