import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS Service — Netgsm API entegrasyonu
 *
 * .env'ye eklenecek değişkenler:
 * SMS_PROVIDER=netgsm (veya twilio)
 * NETGSM_USERCODE=850XXXXXXX
 * NETGSM_PASSWORD=xxxxx
 * NETGSM_MSGHEADER=SKYWELLNESS
 *
 * Veya Twilio:
 * TWILIO_ACCOUNT_SID=ACxxxxx
 * TWILIO_AUTH_TOKEN=xxxxx
 * TWILIO_FROM_NUMBER=+905xxxxxxxxx
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: 'netgsm' | 'twilio' | null;
  private readonly netgsmUsercode: string;
  private readonly netgsmPassword: string;
  private readonly netgsmHeader: string;

  constructor(private readonly config: ConfigService) {
    const provider = config.get<string>('SMS_PROVIDER')?.trim()?.toLowerCase();

    if (provider === 'netgsm') {
      this.provider = 'netgsm';
      this.netgsmUsercode = config.get<string>('NETGSM_USERCODE')?.trim() || '';
      this.netgsmPassword = config.get<string>('NETGSM_PASSWORD')?.trim() || '';
      this.netgsmHeader = config.get<string>('NETGSM_MSGHEADER')?.trim() || 'SKYWELLNESS';
      this.logger.log('SMS transport: Netgsm');
    } else if (provider === 'twilio') {
      this.provider = 'twilio';
      this.netgsmUsercode = '';
      this.netgsmPassword = '';
      this.netgsmHeader = '';
      this.logger.log('SMS transport: Twilio');
    } else {
      this.provider = null;
      this.netgsmUsercode = '';
      this.netgsmPassword = '';
      this.netgsmHeader = '';
      this.logger.warn('SMS disabled — SMS_PROVIDER not configured');
    }
  }

  isConfigured(): boolean {
    return this.provider !== null;
  }

  /**
   * SMS gönder
   * @param phone Telefon numarası (05XX XXX XX XX formatında)
   * @param message SMS metni (max 160 karakter önerilir)
   */
  async send(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.provider) {
      this.logger.debug(`SMS skipped (no provider): ${phone} — ${message.slice(0, 50)}`);
      return { ok: false, error: 'SMS provider not configured' };
    }

    // Telefon numarasını normalize et (05XX → 905XX)
    const normalized = this.normalizePhone(phone);
    if (!normalized) {
      return { ok: false, error: 'Invalid phone number' };
    }

    try {
      if (this.provider === 'netgsm') {
        return await this.sendViaNetgsm(normalized, message);
      }
      // Twilio desteği ileride eklenebilir
      return { ok: false, error: 'Provider not implemented' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMS send failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  private normalizePhone(phone: string): string | null {
    // Boşlukları ve tire/parantezleri kaldır
    const cleaned = phone.replace(/[\s\-()]/g, '');
    // 05XX... → 905XX...
    if (cleaned.startsWith('05') && cleaned.length === 11) {
      return '9' + cleaned;
    }
    // +905XX... → 905XX...
    if (cleaned.startsWith('+90') && cleaned.length === 13) {
      return cleaned.slice(1);
    }
    // 905XX... zaten doğru
    if (cleaned.startsWith('90') && cleaned.length === 12) {
      return cleaned;
    }
    return null;
  }

  private async sendViaNetgsm(
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const url = 'https://api.netgsm.com.tr/sms/send/get';
    const params = new URLSearchParams({
      usercode: this.netgsmUsercode,
      password: this.netgsmPassword,
      gsmno: phone,
      message: message,
      msgheader: this.netgsmHeader,
      dil: 'TR',
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const text = await res.text();

    // Netgsm başarılı yanıt: "00" veya "01" ile başlar
    if (text.startsWith('00') || text.startsWith('01')) {
      this.logger.log(`SMS sent to ${phone}: ${message.slice(0, 40)}...`);
      return { ok: true };
    }

    this.logger.error(`Netgsm error: ${text}`);
    return { ok: false, error: `Netgsm: ${text}` };
  }

  // ─── Hazır Mesaj Şablonları ─────────────────────────────────────────────────

  async sendReservationConfirmed(phone: string, trainerName: string, date: string, time: string) {
    const msg = `Sayin uyemiz, ${date} tarihinde saat ${time} icin ${trainerName} ile randevunuz olusturulmustur. Iyi seanslar dileriz. Skyland Wellness Club | 0212 XXX XX XX`;
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
  ) {
    const msg = `Sayin uyemiz, randevunuz ${newDate} saat ${newTime} olarak guncellenmistir. Egitmen: ${trainerName}. Skyland Wellness Club`;
    return this.send(phone, msg);
  }
}
