import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SessionType } from '../database/enums';
import { emailShell, escapeHtml, formatDateRange } from './mail-templates';

type SessionTypeKey = 'personal_training' | 'massage';
type Transport = 'smtp' | 'resend' | null;

function pickResendMessageId(data: unknown): string {
  if (data && typeof data === 'object' && 'id' in data) {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === 'string') {
      return id;
    }
  }
  return 'ok';
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transport;
  private readonly resend: Resend | null;
  private readonly smtp: Transporter | null;
  private readonly fromAddress: string;
  private readonly replyTo: string | undefined;
  private readonly locale: string;
  private readonly timeZone: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = config.get<string>('SMTP_HOST')?.trim();
    const resendKey = config.get<string>('RESEND_API_KEY')?.trim();

    if (smtpHost) {
      const port = Number.parseInt(config.get<string>('SMTP_PORT') ?? '587', 10) || 587;
      const user = config.get<string>('SMTP_USER')?.trim();
      const pass = config.get<string>('SMTP_PASSWORD')?.trim();
      // Port 465 = implicit TLS; 587 = STARTTLS upgrade.
      const secure = port === 465;
      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        // Some shared hosting (e.g. Natro) uses certs that don't perfectly match
        // the hostname; relax verification to avoid TLS errors while still using
        // an encrypted channel.
        tls: { rejectUnauthorized: false },
      });
      this.resend = null;
      this.transport = 'smtp';
      this.logger.log(`Mail transport: SMTP ${smtpHost}:${port} (secure=${secure})`);
    } else if (resendKey) {
      this.resend = new Resend(resendKey);
      this.smtp = null;
      this.transport = 'resend';
      this.logger.log('Mail transport: Resend');
    } else {
      this.resend = null;
      this.smtp = null;
      this.transport = null;
      this.logger.warn(
        'No mail transport configured (SMTP_HOST and RESEND_API_KEY both missing). Transactional emails are disabled.',
      );
    }

    this.fromAddress =
      config.get<string>('MAIL_FROM')?.trim() ||
      (this.transport === 'smtp'
        ? 'Wellness Club <info@wellnessclub.com>'
        : 'Sky Wellness <onboarding@resend.dev>');
    const rt = config.get<string>('MAIL_REPLY_TO')?.trim();
    this.replyTo = rt || undefined;
    this.locale = config.get<string>('MAIL_LOCALE')?.trim() || 'tr-TR';
    this.timeZone = config.get<string>('MAIL_TIMEZONE')?.trim() || 'Europe/Istanbul';
  }

  isConfigured(): boolean {
    return this.transport !== null;
  }

  /**
   * Verify the active transport can reach the mail server. Used by the test endpoint
   * during deploy/smoke tests. SMTP only — Resend has no built-in verify.
   */
  async verifyTransport(): Promise<{ ok: boolean; transport: Transport; error?: string }> {
    if (!this.transport) {
      return { ok: false, transport: null, error: 'no transport configured' };
    }
    if (this.transport === 'smtp' && this.smtp) {
      try {
        await this.smtp.verify();
        return { ok: true, transport: 'smtp' };
      } catch (cause: unknown) {
        return {
          ok: false,
          transport: 'smtp',
          error: cause instanceof Error ? cause.message : String(cause),
        };
      }
    }
    return { ok: true, transport: this.transport };
  }

  private async send(params: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.transport) {
      return;
    }
    const recipients = params.to.filter(Boolean);
    if (recipients.length === 0) {
      return;
    }
    if (this.transport === 'smtp' && this.smtp) {
      try {
        const info: unknown = await this.smtp.sendMail({
          from: this.fromAddress,
          to: recipients,
          subject: params.subject,
          html: params.html,
          text: params.text,
          ...(this.replyTo ? { replyTo: this.replyTo } : {}),
        });
        let msgId = 'ok';
        if (info && typeof info === 'object' && 'messageId' in info) {
          const raw = (info as { messageId?: unknown }).messageId;
          if (typeof raw === 'string') {
            msgId = raw;
          }
        }
        this.logger.log(`Email sent via SMTP: ${msgId} → ${recipients.join(', ')}`);
      } catch (cause: unknown) {
        const msg = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`Failed to send email via SMTP: ${msg}`);
      }
      return;
    }
    if (this.transport === 'resend' && this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromAddress,
          to: recipients,
          subject: params.subject,
          html: params.html,
          text: params.text,
          ...(this.replyTo ? { replyTo: this.replyTo } : {}),
        });
        if (error) {
          this.logger.error(`Resend API error: ${JSON.stringify(error)}`);
          return;
        }
        this.logger.log(`Email queued: ${pickResendMessageId(data)} → ${recipients.join(', ')}`);
      } catch (cause: unknown) {
        const msg = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`Failed to send email via Resend: ${msg}`);
      }
    }
  }

  /** Used by the admin test endpoint to send a basic ping to verify deliverability end-to-end. */
  async sendTestEmail(to: string, fromName?: string): Promise<void> {
    const subject = `Wellness Club mail testi · ${new Date().toLocaleString(this.locale, { timeZone: this.timeZone })}`;
    const inner = `
<p style="margin:0 0 16px;">Bu, Wellness Club platformundan gönderilen otomatik bir test e-postasıdır.</p>
<p style="margin:0 0 16px;">Bu mesajı görüyorsanız transactional mail altyapısı doğru çalışıyor demektir.</p>
<p style="margin:0;font-size:13px;color:#94a3b8;">Gönderim zamanı: ${escapeHtml(new Date().toISOString())}</p>`;
    const html = emailShell({
      title: 'Mail testi',
      previewText: 'Wellness Club transactional mail testi',
      innerHtml: inner,
      clubName: fromName?.trim() || 'Wellness Club',
    });
    const text = [
      'Wellness Club mail testi',
      '',
      'Bu, transactional mail altyapısının çalıştığını doğrulamak için gönderilmiş otomatik bir mesajdır.',
      `Gönderim zamanı: ${new Date().toISOString()}`,
    ].join('\n');
    await this.send({ to: [to], subject, html, text });
  }

  private sessionTypeKey(st: SessionType): SessionTypeKey {
    return st === SessionType.MASSAGE ? 'massage' : 'personal_training';
  }

  private sessionTypeLabel(type: SessionType): string {
    return this.sessionTypeKey(type) === 'massage' ? 'Masaj' : 'Özel ders';
  }

  async sendReservationConfirmed(params: {
    to: string;
    memberFirstName: string;
    clubName: string;
    trainerName: string;
    sessionType: SessionType;
    startTime: Date;
    endTime: Date;
    packageTypeName: string;
    remainingSessions: number;
  }): Promise<void> {
    const { dateLine, timeLine } = formatDateRange(
      params.startTime,
      params.endTime,
      this.locale,
      this.timeZone,
    );
    const kind = this.sessionTypeLabel(params.sessionType);
    const subject = `${params.clubName} — Rezervasyonunuz onaylandı`;
    const inner = `
<p style="margin:0 0 16px;">Merhaba ${escapeHtml(params.memberFirstName)},</p>
<p style="margin:0 0 16px;">Seans rezervasyonunuz oluşturuldu.</p>
<div style="margin:20px 0;padding:16px 18px;background:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(148,163,184,0.2);">
  <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">${escapeHtml(kind)}</p>
  <p style="margin:0 0 4px;font-weight:700;color:#f8fafc;">${escapeHtml(params.trainerName)}</p>
  <p style="margin:8px 0 0;color:#cbd5e1;">${escapeHtml(dateLine)}</p>
  <p style="margin:4px 0 0;color:#fcd34d;font-weight:700;">${escapeHtml(timeLine)}</p>
  <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;">Paket: ${escapeHtml(params.packageTypeName)}</p>
  <p style="margin:6px 0 0;font-size:14px;color:#94a3b8;">Kalan seans: <strong style="color:#e2e8f0;">${params.remainingSessions}</strong></p>
</div>
<p style="margin:0;font-size:13px;color:#94a3b8;">İptal ve kurallar için uygulamanızı veya kulübünüzü kullanın.</p>`;
    const html = emailShell({
      title: 'Rezervasyon onaylandı',
      previewText: `${kind} ${dateLine}`,
      innerHtml: inner,
      clubName: params.clubName,
    });
    const text = [
      `Merhaba ${params.memberFirstName},`,
      ``,
      `Rezervasyonunuz onaylandı.`,
      `${kind} — ${params.trainerName}`,
      `${dateLine} ${timeLine}`,
      `Paket: ${params.packageTypeName}`,
      `Kalan seans: ${params.remainingSessions}`,
      ``,
      params.clubName,
    ].join('\n');
    await this.send({ to: [params.to], subject, html, text });
  }

  async sendReservationCancelled(params: {
    to: string;
    memberFirstName: string;
    clubName: string;
    trainerName: string;
    sessionType: SessionType;
    startTime: Date;
    endTime: Date;
    remainingSessions: number;
  }): Promise<void> {
    const { dateLine, timeLine } = formatDateRange(
      params.startTime,
      params.endTime,
      this.locale,
      this.timeZone,
    );
    const kind = this.sessionTypeLabel(params.sessionType);
    const subject = `${params.clubName} — Rezervasyon iptal edildi`;
    const inner = `
<p style="margin:0 0 16px;">Merhaba ${escapeHtml(params.memberFirstName)},</p>
<p style="margin:0 0 16px;">Aşağıdaki seans rezervasyonunuz iptal edildi. Paketinize seans hakkı iade edildi.</p>
<div style="margin:20px 0;padding:16px 18px;background:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(148,163,184,0.2);">
  <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">${escapeHtml(kind)}</p>
  <p style="margin:0 0 4px;font-weight:700;color:#f8fafc;">${escapeHtml(params.trainerName)}</p>
  <p style="margin:8px 0 0;color:#cbd5e1;">${escapeHtml(dateLine)}</p>
  <p style="margin:4px 0 0;color:#fcd34d;font-weight:700;">${escapeHtml(timeLine)}</p>
  <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;">Güncel kalan seans: <strong style="color:#e2e8f0;">${params.remainingSessions}</strong></p>
</div>`;
    const html = emailShell({
      title: 'Rezervasyon iptal edildi',
      previewText: `İptal: ${kind} ${dateLine}`,
      innerHtml: inner,
      clubName: params.clubName,
    });
    const text = [
      `Merhaba ${params.memberFirstName},`,
      ``,
      `Rezervasyon iptal edildi; seans hakkı iade edildi.`,
      `${kind} — ${params.trainerName}`,
      `${dateLine} ${timeLine}`,
      `Kalan seans: ${params.remainingSessions}`,
      ``,
      params.clubName,
    ].join('\n');
    await this.send({ to: [params.to], subject, html, text });
  }

  async sendPackageRequestMemberAck(params: {
    to: string;
    memberFirstName: string;
    clubName: string;
    sessionType: SessionType;
    messagePreview: string | null;
    preferredTrainerSummary?: string | null;
  }): Promise<void> {
    const kind = this.sessionTypeLabel(params.sessionType);
    const subject = `${params.clubName} — Paket talebiniz alındı`;
    const extra = params.messagePreview
      ? `<p style="margin:12px 0 0;padding:12px 14px;background:rgba(15,23,42,0.5);border-radius:8px;font-size:14px;color:#cbd5e1;">${escapeHtml(params.messagePreview)}</p>`
      : '';
    const trainerLine =
      params.preferredTrainerSummary && params.preferredTrainerSummary.length > 0
        ? `<p style="margin:0 0 16px;font-size:14px;color:#e2e8f0;">Tercih ettiğiniz ekip üyesi: <strong style="color:#f8fafc;">${escapeHtml(params.preferredTrainerSummary)}</strong> (talep notu; kesin atama resepsiyon onayına bağlıdır).</p>`
        : '';
    const inner = `
<p style="margin:0 0 16px;">Merhaba ${escapeHtml(params.memberFirstName)},</p>
<p style="margin:0 0 16px;">${escapeHtml(kind)} paket talebiniz kulübe iletildi. Resepsiyon veya satış ekibi onayladığında bilgilendirileceksiniz.</p>
${trainerLine}
${extra}
<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Bu e-posta otomatik gönderilmiştir.</p>`;
    const html = emailShell({
      title: 'Talebiniz alındı',
      previewText: `${kind} paket talebi`,
      innerHtml: inner,
      clubName: params.clubName,
    });
    const text = [
      `Merhaba ${params.memberFirstName},`,
      ``,
      `${kind} paket talebiniz kulübe iletildi.`,
      params.preferredTrainerSummary ? `Tercih (bilgi): ${params.preferredTrainerSummary}` : '',
      params.messagePreview ?? '',
      ``,
      params.clubName,
    ].join('\n');
    await this.send({ to: [params.to], subject, html, text });
  }

  async sendPackageRequestStaffAlert(params: {
    to: string[];
    clubName: string;
    memberName: string;
    memberEmail: string;
    sessionType: SessionType;
    messagePreview: string | null;
    requestId: string;
    preferredTrainerSummary?: string | null;
  }): Promise<void> {
    const kind = this.sessionTypeLabel(params.sessionType);
    const subject = `[${params.clubName}] Yeni paket talebi — ${kind}`;
    const msg = params.messagePreview
      ? escapeHtml(params.messagePreview)
      : '<span style="color:#64748b;">(mesaj yok)</span>';
    const trainerLine =
      params.preferredTrainerSummary && params.preferredTrainerSummary.length > 0
        ? `<p style="margin:0 0 8px;"><strong style="color:#f8fafc;">Üye tercihi (eğitmen/terapist):</strong> ${escapeHtml(params.preferredTrainerSummary)}</p>`
        : '';
    const inner = `
<p style="margin:0 0 12px;font-size:14px;color:#94a3b8;">Salon panelinden talebi inceleyin.</p>
<div style="margin:16px 0;padding:16px 18px;background:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(148,163,184,0.2);">
  <p style="margin:0 0 8px;"><strong style="color:#f8fafc;">Üye:</strong> ${escapeHtml(params.memberName)}</p>
  <p style="margin:0 0 8px;"><strong style="color:#f8fafc;">E-posta:</strong> ${escapeHtml(params.memberEmail)}</p>
  <p style="margin:0 0 8px;"><strong style="color:#f8fafc;">Tür:</strong> ${escapeHtml(kind)}</p>
  ${trainerLine}
  <p style="margin:0 0 8px;"><strong style="color:#f8fafc;">Talep no:</strong> <code style="font-size:13px;color:#fcd34d;">${escapeHtml(params.requestId)}</code></p>
  <p style="margin:12px 0 0;font-size:14px;color:#cbd5e1;">${msg}</p>
</div>`;
    const html = emailShell({
      title: 'Yeni paket talebi',
      previewText: `${params.memberName} — ${kind}`,
      innerHtml: inner,
      clubName: params.clubName,
      footerNote:
        'Onay veya red işlemini tamamladığınızda üyeye uygulama bildirimi göndermeyi unutmayın.',
    });
    const text = [
      `Yeni paket talebi (${params.clubName})`,
      `Talep: ${params.requestId}`,
      `Üye: ${params.memberName} <${params.memberEmail}>`,
      `Tür: ${kind}`,
      params.preferredTrainerSummary ? `Üye tercihi: ${params.preferredTrainerSummary}` : '',
      params.messagePreview ?? '',
    ].join('\n');
    await this.send({ to: params.to, subject, html, text });
  }

  /**
   * Booking onayı + dijital bilet maili (üye veya misafir).
   * Stripe Checkout başarısı sonrası webhook tarafından çağrılır.
   */
  async sendBookingConfirmation(params: {
    to: string;
    guestName: string;
    clubName: string;
    serviceName: string;
    providerName?: string | null;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    totalAmount: string;
    kaporaAmount?: string | null;
    remainingAmount?: string | null;
    currency: string;
    appointmentId: string;
    addons?: Array<{ name: string; quantity: number }>;
    cancellationDeadline?: string | null; // ISO string; 3 saat öncesi
  }): Promise<void> {
    const subject = `${params.clubName} — Rezervasyonunuz onaylandı 🎫`;
    const ticketCode = params.appointmentId.slice(0, 8).toUpperCase();
    // Telefon ile gösterilebilen QR — appointment ID'yi kodluyoruz
    const qrData = encodeURIComponent(`WC-${params.appointmentId}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${qrData}`;

    const addonsHtml =
      params.addons && params.addons.length > 0
        ? `<p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">Ek hizmetler: ${params.addons.map((a) => `${escapeHtml(a.name)} ×${a.quantity}`).join(', ')}</p>`
        : '';

    const cancelLine = params.cancellationDeadline
      ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Ücretsiz iptal için son tarih: <strong style="color:#475569;">${escapeHtml(params.cancellationDeadline)}</strong>. Bu tarihten sonra iptal edilen rezervasyonlar için iade yapılmaz.</p>`
      : '';

    // Kapora bilgisi
    const paymentHtml = params.kaporaAmount
      ? `<p style="margin:0;font-size:14px;color:#475569;">Toplam hizmet bedeli: <strong style="color:#0f172a;">${escapeHtml(params.totalAmount)} ${escapeHtml(params.currency)}</strong></p>
         <p style="margin:4px 0 0;font-size:14px;color:#6366f1;font-weight:700;">✓ Kapora ödendi: ${escapeHtml(params.kaporaAmount)} ${escapeHtml(params.currency)}</p>
         <p style="margin:4px 0 0;font-size:14px;color:#475569;">Kalan tutar (kulüpte ödenecek): <strong>${escapeHtml(params.remainingAmount || '0')} ${escapeHtml(params.currency)}</strong></p>`
      : `<p style="margin:0;font-size:14px;color:#475569;">Toplam ödeme: <strong style="color:#0f172a;font-size:16px;">${escapeHtml(params.totalAmount)} ${escapeHtml(params.currency)}</strong></p>`;

    const inner = `
<p style="margin:0 0 16px;">Merhaba ${escapeHtml(params.guestName)},</p>
<p style="margin:0 0 16px;">Ödemeniz alındı, rezervasyonunuz onaylandı. Bu mail dijital biletinizdir.</p>

<div style="margin:24px 0;padding:20px;background:#0f172a;border-radius:14px;color:#f8fafc;text-align:center;">
  <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">Rezervasyon Kodu</p>
  <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.18em;color:#fbbf24;font-family:'Courier New',monospace;">${escapeHtml(ticketCode)}</p>
  <div style="margin:14px 0 0;padding:8px;background:#ffffff;border-radius:8px;display:inline-block;">
    <img src="${qrUrl}" alt="QR" width="180" height="180" style="display:block;width:180px;height:180px;" />
  </div>
  <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Kulüpte bu kodu veya QR'ı gösterin.</p>
</div>

<div style="margin:20px 0;padding:18px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
  <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">${escapeHtml(params.serviceName)}</p>
  ${params.providerName ? `<p style="margin:0 0 4px;font-weight:700;color:#0f172a;">${escapeHtml(params.providerName)}</p>` : ''}
  <p style="margin:8px 0 0;color:#334155;">📅 ${escapeHtml(params.date)}</p>
  <p style="margin:4px 0 0;color:#0ea5e9;font-weight:700;">🕐 ${escapeHtml(params.startTime)} – ${escapeHtml(params.endTime)}</p>
  <p style="margin:12px 0 0;font-size:14px;color:#334155;">📍 ${escapeHtml(params.clubName)}</p>
  ${addonsHtml}
  <hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0;" />
  ${paymentHtml}
</div>

${cancelLine}

<p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Sorularınız için: <a href="mailto:info@wellnessclub.com" style="color:#38bdf8;">info@wellnessclub.com</a> · <a href="https://www.instagram.com/wellnessclub.tr" style="color:#38bdf8;">@wellnessclub.tr</a></p>`;

    const html = emailShell({
      title: 'Rezervasyon onaylandı',
      previewText: `${params.serviceName} · ${params.date} ${params.startTime}`,
      innerHtml: inner,
      clubName: params.clubName,
    });

    const text = [
      `Merhaba ${params.guestName},`,
      '',
      'Rezervasyonunuz onaylandı.',
      `Rezervasyon Kodu: ${ticketCode}`,
      '',
      `Hizmet: ${params.serviceName}`,
      params.providerName ? `Eğitmen/Terapist: ${params.providerName}` : '',
      `Tarih: ${params.date}`,
      `Saat: ${params.startTime} – ${params.endTime}`,
      `Kulüp: ${params.clubName}`,
      `Toplam: ${params.totalAmount} ${params.currency}`,
      params.kaporaAmount ? `Kapora ödendi: ${params.kaporaAmount} ${params.currency}` : '',
      params.remainingAmount ? `Kalan (kulüpte): ${params.remainingAmount} ${params.currency}` : '',
      '',
      params.cancellationDeadline ? `Ücretsiz iptal son tarih: ${params.cancellationDeadline}` : '',
      '',
      params.clubName,
    ]
      .filter(Boolean)
      .join('\n');

    await this.send({ to: [params.to], subject, html, text });
  }

  async sendPasswordReset(params: {
    to: string;
    firstName: string;
    clubName: string;
    resetToken: string;
  }): Promise<void> {
    const appUrl = this.config.get<string>('APP_BASE_URL')?.trim() || 'https://skywellness.app';
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(params.resetToken)}`;
    const subject = `${params.clubName} — Şifre sıfırlama talebi`;
    const inner = `
<p style="margin:0 0 16px;">Merhaba ${escapeHtml(params.firstName)},</p>
<p style="margin:0 0 16px;">Şifre sıfırlama talebiniz alındı. 30 dakika içinde aşağıdaki bağlantıyı kullanabilirsiniz.</p>
<p style="margin:0 0 16px;"><a href="${escapeHtml(resetUrl)}" style="color:#38bdf8;">Şifremi sıfırla</a></p>
<p style="margin:0;font-size:13px;color:#94a3b8;">Bu işlemi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>`;
    const html = emailShell({
      title: 'Şifre sıfırlama',
      previewText: 'Şifrenizi yenilemek için bağlantı',
      innerHtml: inner,
      clubName: params.clubName,
    });
    const text = [
      `Merhaba ${params.firstName},`,
      '',
      'Şifre sıfırlama talebiniz alındı.',
      'Aşağıdaki bağlantı 30 dakika geçerlidir:',
      resetUrl,
      '',
      `${params.clubName}`,
    ].join('\n');
    await this.send({ to: [params.to], subject, html, text });
  }
}
