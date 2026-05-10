import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS Service — Hybrid Netgsm (Türkiye) + Twilio (uluslararası) entegrasyonu.
 *
 * .env değişkenleri:
 *
 * SMS_PROVIDER=hybrid | netgsm | twilio  (default: hybrid)
 *
 * # Netgsm (TR numaraları için öncelikli)
 * NETGSM_USERCODE=xxxxx
 * NETGSM_PASSWORD=xxxxx
 * NETGSM_MSGHEADER=TRAIR TEKN.
 *
 * # Twilio (TR olmayan numaralar + Netgsm yedeği)
 * TWILIO_ACCOUNT_SID=ACxxxxx
 * TWILIO_AUTH_TOKEN=xxxxx
 * TWILIO_PHONE_NUMBER=+1...   (veya TWILIO_FROM_NUMBER)
 * TWILIO_MESSAGING_SERVICE_SID=MGxxxxx  (varsa öncelikli)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly mode: 'hybrid' | 'netgsm' | 'twilio' | null;

  private readonly netgsmUsercode: string;
  private readonly netgsmPassword: string;
  private readonly netgsmHeader: string;
  private readonly netgsmReady: boolean;

  private readonly twilioSid: string;
  private readonly twilioToken: string;
  private readonly twilioFrom: string;
  private readonly twilioMessagingServiceSid: string;
  private readonly twilioReady: boolean;

  constructor(private readonly config: ConfigService) {
    const requested = (config.get<string>('SMS_PROVIDER') || 'hybrid').trim().toLowerCase();

    this.netgsmUsercode = config.get<string>('NETGSM_USERCODE')?.trim() || '';
    this.netgsmPassword = config.get<string>('NETGSM_PASSWORD')?.trim() || '';
    this.netgsmHeader = config.get<string>('NETGSM_MSGHEADER')?.trim() || 'SKYWELLNESS';
    this.netgsmReady = !!(this.netgsmUsercode && this.netgsmPassword);

    this.twilioSid = config.get<string>('TWILIO_ACCOUNT_SID')?.trim() || '';
    this.twilioToken = config.get<string>('TWILIO_AUTH_TOKEN')?.trim() || '';
    this.twilioFrom =
      config.get<string>('TWILIO_FROM_NUMBER')?.trim() ||
      config.get<string>('TWILIO_PHONE_NUMBER')?.trim() ||
      '';
    this.twilioMessagingServiceSid =
      config.get<string>('TWILIO_MESSAGING_SERVICE_SID')?.trim() || '';
    this.twilioReady =
      !!this.twilioSid &&
      !!this.twilioToken &&
      !!(this.twilioFrom || this.twilioMessagingServiceSid);

    if (requested === 'twilio') {
      if (this.twilioReady) {
        this.mode = 'twilio';
        this.logger.log('SMS transport: Twilio');
      } else {
        this.mode = null;
        this.logger.warn('SMS_PROVIDER=twilio ama Twilio bilgileri eksik — SMS devre dışı');
      }
    } else if (requested === 'netgsm') {
      if (this.netgsmReady) {
        this.mode = 'netgsm';
        this.logger.log('SMS transport: Netgsm');
      } else {
        this.mode = null;
        this.logger.warn('SMS_PROVIDER=netgsm ama Netgsm bilgileri eksik — SMS devre dışı');
      }
    } else if (requested === 'hybrid') {
      if (this.netgsmReady || this.twilioReady) {
        this.mode = 'hybrid';
        const parts: string[] = [];
        if (this.netgsmReady) parts.push('Netgsm');
        if (this.twilioReady) parts.push('Twilio');
        this.logger.log(`SMS transport: Hybrid (${parts.join(' + ')})`);
      } else {
        this.mode = null;
        this.logger.warn('Hiçbir SMS sağlayıcısı yapılandırılmamış — SMS devre dışı');
      }
    } else {
      this.mode = null;
      this.logger.warn(`SMS_PROVIDER="${requested}" geçersiz — SMS devre dışı`);
    }
  }

  isConfigured(): boolean {
    return this.mode !== null;
  }

  /**
   * Hybrid: TR → Netgsm (başarısızsa Twilio), diğer → Twilio
   */
  async send(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.mode) {
      this.logger.debug(`SMS skipped (no provider): ${phone}`);
      return { ok: false, error: 'SMS provider not configured' };
    }

    const digits = this.normalizeDigits(phone);
    if (!digits) return { ok: false, error: 'Invalid phone number' };
    const isTurkish = digits.startsWith('90') && digits.length === 12;

    if (this.mode === 'netgsm') {
      if (!isTurkish) {
        this.logger.warn(`Netgsm sadece TR numara destekler, atlandı: ${digits}`);
        return { ok: false, error: 'Netgsm: only Turkish numbers supported' };
      }
      return this.sendViaNetgsm(digits, message);
    }
    if (this.mode === 'twilio') {
      return this.sendViaTwilio(digits, message);
    }

    // hybrid
    if (isTurkish && this.netgsmReady) {
      const r = await this.sendViaNetgsm(digits, message);
      if (r.ok) return r;
      if (this.twilioReady) {
        this.logger.warn(`Netgsm failed, Twilio fallback: ${digits}`);
        return this.sendViaTwilio(digits, message);
      }
      return r;
    }
    if (this.twilioReady) return this.sendViaTwilio(digits, message);
    return { ok: false, error: 'No suitable SMS provider available' };
  }

  /** 0532 / +90 532 / 90532 / 532 / +1... hepsini canonical formata çevirir. */
  private normalizeDigits(phone: string): string | null {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('05') && cleaned.length === 11) return '9' + cleaned;
    if (cleaned.startsWith('+90') && cleaned.length === 13) return cleaned.slice(1);
    if (cleaned.startsWith('90') && cleaned.length === 12) return cleaned;
    if (cleaned.startsWith('+') && cleaned.length >= 9) return cleaned.slice(1);
    if (cleaned.startsWith('5') && cleaned.length === 10) return '90' + cleaned;
    return null;
  }

  // ─── Netgsm ────────────────────────────────────────────────────────────────

  private async sendViaNetgsm(
    digits: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const url = 'https://api.netgsm.com.tr/sms/send/get';
    const params = new URLSearchParams({
      usercode: this.netgsmUsercode,
      password: this.netgsmPassword,
      gsmno: digits,
      message,
      msgheader: this.netgsmHeader,
      dil: 'TR',
    });

    try {
      const res = await fetch(`${url}?${params.toString()}`);
      const text = await res.text();
      if (text.startsWith('00') || text.startsWith('01')) {
        this.logger.log(`Netgsm sent to ${digits}: ${message.slice(0, 40)}...`);
        return { ok: true };
      }
      this.logger.error(`Netgsm error → ${digits}: ${text}`);
      return { ok: false, error: `Netgsm: ${text}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Netgsm exception → ${digits}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  // ─── Twilio ────────────────────────────────────────────────────────────────

  private async sendViaTwilio(
    digits: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const to = `+${digits}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', to);
    if (this.twilioMessagingServiceSid) {
      params.append('MessagingServiceSid', this.twilioMessagingServiceSid);
    } else {
      params.append('From', this.twilioFrom);
    }
    params.append('Body', message);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const body = (await res.json()) as { sid?: string; message?: string; code?: number };
      if (res.ok && body.sid) {
        this.logger.log(`Twilio sent to ${to}: sid=${body.sid}`);
        return { ok: true };
      }
      this.logger.error(
        `Twilio error → ${to}: code=${body.code ?? 'n/a'} ${body.message ?? res.statusText}`,
      );
      return { ok: false, error: `Twilio: ${body.message ?? res.statusText}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Twilio exception → ${to}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  // ─── Hazır Mesaj Şablonları ─────────────────────────────────────────────────

  async sendReservationConfirmed(
    phone: string,
    trainerName: string,
    date: string,
    time: string,
    ticketId?: string,
  ) {
    const ticketLink = ticketId
      ? ` Biletiniz: https://www.wellnessclub.tech/api/v1/ticket/${ticketId}`
      : '';
    const msg = `Sayin uyemiz, ${date} tarihinde saat ${time} icin ${trainerName} ile randevunuz olusturulmustur. Iyi seanslar dileriz.${ticketLink} Skyland Wellness Club`;
    return this.send(phone, msg);
  }

  async sendReservationCancelled(phone: string, date: string, time: string) {
    const msg = `Sayin uyemiz, ${date} saat ${time} randevunuz iptal edilmistir. Yeni randevu icin uygulamamizi kullanabilirsiniz. Skyland Wellness Club`;
    return this.send(phone, msg);
  }

  async sendMemberApproved(phone: string, firstName: string) {
    const msg = `Merhaba ${firstName}, Skyland Wellness Club uyeliginiz onaylandi. Artik randevu alabilir, etkinliklere katilabilirsiniz. Hosgeldiniz!`;
    return this.send(phone, msg);
  }

  async sendNewBookingNotification(phone: string, memberName: string, date: string, time: string) {
    const msg = `Yeni randevu bilgisi: ${memberName} - ${date} saat ${time}. Skyland Wellness Club`;
    return this.send(phone, msg);
  }

  async sendPackageAssigned(phone: string, packageName: string) {
    const msg = `Sayin uyemiz, ${packageName} paketiniz basariyla tanimlanmistir. Iyi seanslar dileriz. Skyland Wellness Club`;
    return this.send(phone, msg);
  }

  async sendReservationRescheduled(
    phone: string,
    newDate: string,
    newTime: string,
    trainerName: string,
    ticketId?: string,
  ) {
    const ticketLink = ticketId
      ? ` Guncellenmis biletiniz: https://www.wellnessclub.tech/api/v1/ticket/${ticketId}`
      : '';
    const msg = `Sayin uyemiz, randevunuz guncellenmistir. Yeni tarih: ${newDate}, Saat: ${newTime}, Egitmen: ${trainerName}.${ticketLink} Skyland Wellness Club`;
    return this.send(phone, msg);
  }

  async sendReservationReminder(
    phone: string,
    date: string,
    time: string,
    trainerName: string,
    ticketId?: string,
  ) {
    const ticketLink = ticketId
      ? ` Bilet: https://www.wellnessclub.tech/api/v1/ticket/${ticketId}`
      : '';
    const msg = `Hatirlatma: Yarin ${date} saat ${time} icin ${trainerName} ile randevunuz var. Lutfen 10 dk once kulupte olunuz.${ticketLink} Skyland Wellness Club`;
    return this.send(phone, msg);
  }
}
