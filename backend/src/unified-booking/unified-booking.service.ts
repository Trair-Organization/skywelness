import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ServiceCatalog } from '../database/entities/service-catalog.entity';
import { ScheduleSlot } from '../database/entities/schedule-slot.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Addon } from '../database/entities/addon.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Resource } from '../database/entities/resource.entity';
import { UserRole, PackageStatus, SessionType } from '../database/enums';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../notifications/sms.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

@Injectable()
export class UnifiedBookingService {
  private readonly logger = new Logger(UnifiedBookingService.name);

  constructor(
    @InjectRepository(ServiceCatalog) private readonly servicesRepo: Repository<ServiceCatalog>,
    @InjectRepository(ScheduleSlot) private readonly slotsRepo: Repository<ScheduleSlot>,
    @InjectRepository(Appointment) private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Addon) private readonly addonsRepo: Repository<Addon>,
    @InjectRepository(ClubEvent) private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly eventRegsRepo: Repository<ClubEventRegistration>,
    @InjectRepository(Package) private readonly packagesRepo: Repository<Package>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
    @InjectRepository(Campaign) private readonly campaignsRepo: Repository<Campaign>,
    @InjectRepository(Resource) private readonly resourcesRepo: Repository<Resource>,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // SERVICE CATALOG
  // ═══════════════════════════════════════════════════════════

  /** Public: Bir tenant'ın aktif hizmetlerini listele */
  async listServices(tenantSubdomain: string, category?: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const qb = this.servicesRepo
      .createQueryBuilder('s')
      .where('s.tenantId = :tid', { tid: tenant.id })
      .andWhere('s.active = true')
      .orderBy('s.sortOrder', 'ASC');

    if (category) {
      qb.andWhere('s.category = :category', { category });
    }

    const services = await qb.getMany();

    // Provider bilgilerini ekle
    const result = await Promise.all(
      services.map(async (s) => {
        let providerName: string | null = null;
        if (s.providerType === 'trainer' && s.providerId) {
          const trainer = await this.trainersRepo.findOne({
            where: { id: s.providerId },
            relations: ['user'],
          });
          if (trainer) providerName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
        }
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          providerType: s.providerType,
          providerId: s.providerId,
          providerName,
          durationMinutes: s.durationMinutes,
          price: s.price,
          currency: s.currency,
          capacity: s.capacity,
          imageUrl: s.imageUrl,
          resourceId: s.resourceId,
          metadata: s.metadata,
        };
      }),
    );

    return result;
  }

  /** Admin: Hizmet oluştur */
  async createService(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      providerType: string;
      providerId?: string;
      durationMinutes?: number;
      price: number;
      currency?: string;
      capacity?: number;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const service = this.servicesRepo.create({
      tenantId,
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      providerType: data.providerType,
      providerId: data.providerId ?? null,
      durationMinutes: data.durationMinutes ?? 60,
      price: String(data.price),
      currency: data.currency ?? 'TRY',
      capacity: data.capacity ?? 1,
      imageUrl: data.imageUrl ?? null,
      metadata: data.metadata ?? {},
      active: true,
    });
    return this.servicesRepo.save(service);
  }

  // ═══════════════════════════════════════════════════════════
  // ADDONS
  // ═══════════════════════════════════════════════════════════

  /** Public: Bir tenant'ın aktif add-on'larını listele */
  async listAddons(tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.addonsRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // STRIPE CHECKOUT
  // ═══════════════════════════════════════════════════════════

  /** Stripe Checkout session oluştur (üye veya misafir) */
  async createCheckoutSession(data: {
    slotId: string;
    addons?: Array<{ addonId: string; quantity: number }>;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
  }) {
    const slot = await this.slotsRepo.findOne({
      where: { id: data.slotId },
      relations: ['service'],
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'available') throw new BadRequestException('Slot is not available');
    if (slot.bookedCount >= slot.capacity) throw new BadRequestException('Slot is full');

    // Line items oluştur — KAPORA MODELİ: Toplam tutarın komisyon oranı kadar alınır (platform komisyonu)
    const tenant = await this.tenantsRepo.findOne({ where: { id: slot.tenantId } });
    const COMMISSION_RATE = tenant ? parseFloat(tenant.commissionRate) : 0.15;
    const basePrice = Math.round(parseFloat(slot.price) * 100); // kuruş
    let totalCents = basePrice;

    // Add-on'ları hesapla
    const addonNames: string[] = [];
    if (data.addons && data.addons.length > 0) {
      for (const item of data.addons) {
        const addon = await this.addonsRepo.findOne({
          where: { id: item.addonId, tenantId: slot.tenantId, active: true },
        });
        if (addon && item.quantity > 0) {
          totalCents += Math.round(parseFloat(String(addon.price)) * 100) * item.quantity;
          addonNames.push(`${addon.name} ×${item.quantity}`);
        }
      }
    }

    const kaporaCents = Math.ceil(totalCents * COMMISSION_RATE);
    const totalTRY = (totalCents / 100).toFixed(2);
    const kaporaTRY = (kaporaCents / 100).toFixed(2);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'try',
          product_data: {
            name: `Kapora — ${slot.service?.name || 'Rezervasyon'}`,
            description: `${slot.date} · ${slot.startTime}-${slot.endTime} | Toplam: ${totalTRY}₺ · Kapora (%15): ${kaporaTRY}₺${addonNames.length > 0 ? ` · Ek: ${addonNames.join(', ')}` : ''}`,
          },
          unit_amount: kaporaCents,
        },
        quantity: 1,
      },
    ];

    // Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `https://www.wellnessclub.tech/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.wellnessclub.tech/booking-cancel`,
      metadata: {
        slotId: slot.id,
        tenantId: slot.tenantId,
        serviceId: slot.serviceId,
        guestName: data.guestName || '',
        guestPhone: data.guestPhone || '',
        guestEmail: data.guestEmail || '',
        addons: JSON.stringify(data.addons || []),
        totalAmount: totalTRY,
        kaporaAmount: kaporaTRY,
        commissionRate: String(COMMISSION_RATE),
      },
      ...(data.guestEmail ? { customer_email: data.guestEmail } : {}),
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Stripe webhook — ödeme başarılı olunca rezervasyon oluştur ve dijital bilet maili gönder.
   * Production: STRIPE_WEBHOOK_SECRET env değişkeni zorunlu, signature header doğrulanır.
   * Body raw Buffer olarak gelmeli (main.ts: rawBody:true + controller: @Req).
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (webhookSecret) {
      if (!signature) {
        this.logger.warn('Stripe webhook called without stripe-signature header');
        throw new BadRequestException('Missing stripe-signature header');
      }
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Stripe webhook signature verification failed: ${msg}`);
        throw new BadRequestException(`Webhook signature verification failed: ${msg}`);
      }
    } else {
      // Webhook secret henüz ayarlanmadıysa (yerel/staging) JSON parse fallback
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured — skipping signature verification');
      try {
        event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
      } catch {
        throw new BadRequestException('Invalid JSON body');
      }
    }

    if (event.type !== 'checkout.session.completed') {
      // Diğer event'leri görmezden gel
      return { ok: true, ignored: event.type };
    }

    const session = event.data.object;
    if (session.payment_status !== 'paid') {
      return { ok: true, status: session.payment_status };
    }

    const md = session.metadata || {};
    const slotId = md.slotId;
    const tenantId = md.tenantId;
    const serviceId = md.serviceId;

    // Event checkout mu?
    if (md.type === 'event') {
      return this.handleEventPaymentCompleted(
        session as unknown as {
          id: string;
          metadata: Record<string, string>;
          customer_details?: { email?: string };
        },
      );
    }

    // Campaign checkout mu?
    if (md.type === 'campaign') {
      return this.handleCampaignPaymentCompleted(
        session as unknown as {
          id: string;
          metadata: Record<string, string>;
          customer_details?: { email?: string };
        },
      );
    }

    if (!slotId || !tenantId || !serviceId) {
      this.logger.error(`Stripe webhook missing required metadata: ${JSON.stringify(md)}`);
      return { ok: false, error: 'missing metadata' };
    }

    // Idempotency: aynı session ile çift kayıt oluşmasın
    const existing = await this.appointmentsRepo.findOne({
      where: { stripeSessionId: session.id },
    });
    if (existing) {
      this.logger.log(
        `Duplicate webhook for session ${session.id}; appointment ${existing.id} already exists`,
      );
      return { ok: true, duplicate: true, appointmentId: existing.id };
    }

    const slot = await this.slotsRepo.findOne({
      where: { id: slotId },
      relations: ['service'],
    });
    if (!slot) {
      this.logger.error(`Slot not found for session ${session.id}: ${slotId}`);
      return { ok: false, error: 'slot not found' };
    }
    if (slot.bookedCount >= slot.capacity) {
      // Aşırı durumda: ödeme alındı ama slot dolmuş — manuel iade gerekir, log
      this.logger.error(
        `Slot ${slotId} full but payment received for session ${session.id} — manual refund needed`,
      );
      return { ok: false, error: 'slot full', requiresRefund: true };
    }

    const guestName = md.guestName || 'Misafir';
    const guestPhone = md.guestPhone || '';
    const guestEmail = (session.customer_details?.email || md.guestEmail || '').toLowerCase();

    const addons: Array<{ addonId: string; quantity: number }> = (() => {
      try {
        const parsed: unknown = JSON.parse(md.addons || '[]');
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (x): x is { addonId: string; quantity: number } =>
              x !== null && typeof x === 'object' && 'addonId' in x && 'quantity' in x,
          );
        }
        return [];
      } catch {
        return [];
      }
    })();

    // Add-on detaylarını çek (mail için)
    const addonDetails: Array<{ name: string; quantity: number }> = [];
    let addonTotal = 0;
    for (const item of addons) {
      const addon = await this.addonsRepo.findOne({ where: { id: item.addonId } });
      if (addon && item.quantity > 0) {
        addonDetails.push({ name: addon.name, quantity: item.quantity });
        addonTotal += parseFloat(String(addon.price)) * item.quantity;
      }
    }
    const totalAmount = parseFloat(slot.price) + addonTotal;
    const kaporaAmount = md.kaporaAmount || String(Math.ceil(totalAmount * 0.15));

    // Misafir userId — guest user pattern (deterministic by email)
    const userId = await this.resolveGuestUserId(tenantId, guestEmail, guestName, guestPhone);

    // Appointment oluştur
    const appointment = this.appointmentsRepo.create({
      tenantId,
      userId,
      slotId,
      serviceId,
      providerType: slot.providerType,
      providerId: slot.providerId,
      status: 'confirmed',
      totalAmount: String(totalAmount),
      currency: slot.currency,
      paymentStatus: 'deposit_paid',
      paymentMethod: 'card',
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      notes: guestName
        ? `Misafir: ${guestName} · ${guestPhone} · ${guestEmail} | Kapora: ${kaporaAmount}₺ ödendi, kalan: ${(totalAmount - parseFloat(kaporaAmount)).toFixed(0)}₺ kulüpte ödenecek`
        : null,
      participantCount: 1,
      participants: addonDetails.length > 0 ? addonDetails : null,
    });
    const saved = await this.appointmentsRepo.save(appointment);

    // Slot güncelle
    await this.slotsRepo.increment({ id: slotId }, 'bookedCount', 1);
    if (slot.bookedCount + 1 >= slot.capacity) {
      await this.slotsRepo.update({ id: slotId }, { status: 'booked' });
    }

    // Bilet maili gönder
    if (guestEmail) {
      try {
        const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
        let providerName: string | null = null;
        if (slot.providerId) {
          const trainer = await this.trainersRepo.findOne({
            where: { id: slot.providerId },
            relations: ['user'],
          });
          if (trainer && trainer.user) {
            providerName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
          }
        }

        // İptal son tarihi: seans başlangıcından 3 saat önce
        const slotStart = new Date(`${slot.date}T${slot.startTime}:00`);
        const cancellationDeadline = new Date(slotStart.getTime() - 3 * 60 * 60 * 1000);

        await this.mailService.sendBookingConfirmation({
          to: guestEmail,
          guestName: guestName,
          clubName: tenant?.name || 'Wellness Club',
          serviceName: slot.service?.name || 'Rezervasyon',
          providerName,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalAmount: String(totalAmount),
          kaporaAmount: kaporaAmount,
          remainingAmount: String((totalAmount - parseFloat(kaporaAmount)).toFixed(0)),
          currency: slot.currency,
          appointmentId: saved.id,
          addons: addonDetails,
          cancellationDeadline: cancellationDeadline.toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
        this.logger.log(
          `Booking confirmation email sent to ${guestEmail} for appointment ${saved.id}`,
        );
      } catch (err) {
        // Mail hatası rezervasyonu engellemesin — sadece logla
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send booking confirmation email: ${msg}`);
      }
    }

    // SMS gönder
    const guestPhoneForSms = md.guestPhone || '';
    if (guestPhoneForSms) {
      const tenantForSms = await this.tenantsRepo.findOne({ where: { id: tenantId } });
      void this.smsService.send(
        guestPhoneForSms,
        `Rezervasyonunuz onaylandi: ${slot.service?.name ?? 'Rezervasyon'} - ${slot.date} ${slot.startTime}. ${tenantForSms?.name ?? 'Wellness Club'}`,
      );
    }

    return { ok: true, appointmentId: saved.id };
  }

  // ═══════════════════════════════════════════════════════════
  // EVENT CHECKOUT (Ücretli Etkinlikler)
  // ═══════════════════════════════════════════════════════════

  /** Ücretli etkinlik için Stripe Checkout session oluştur (kapora modeli) */
  async createEventCheckout(data: {
    eventId: string;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    userId?: string; // Giriş yapmış üye için
  }) {
    const event = await this.eventsRepo.findOne({ where: { id: data.eventId, published: true } });
    if (!event) throw new NotFoundException('Event not found');

    const price = parseFloat(event.price);
    if (price <= 0) throw new BadRequestException('This event is free — use join endpoint');

    // Kapasite kontrolü
    const regCount = await this.eventRegsRepo.count({ where: { clubEventId: event.id } });
    if (regCount >= event.capacity) throw new BadRequestException('Event is full');

    // Komisyon oranı
    const tenant = await this.tenantsRepo.findOne({ where: { id: event.tenantId } });
    const COMMISSION_RATE = tenant ? parseFloat(tenant.commissionRate) : 0.15;

    const totalCents = Math.round(price * 100);
    const kaporaCents = Math.ceil(totalCents * COMMISSION_RATE);
    const kaporaTRY = (kaporaCents / 100).toFixed(2);

    const startDate = new Date(event.startsAt);
    const dateStr = startDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = startDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: event.currency.toLowerCase(),
            product_data: {
              name: `Kapora — ${event.title}`,
              description: `${dateStr} · ${timeStr} | Toplam: ${price}₺ · Kapora: ${kaporaTRY}₺`,
            },
            unit_amount: kaporaCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://www.wellnessclub.tech/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.wellnessclub.tech/booking-cancel`,
      metadata: {
        type: 'event',
        eventId: event.id,
        tenantId: event.tenantId,
        guestName: data.guestName || '',
        guestPhone: data.guestPhone || '',
        guestEmail: data.guestEmail || '',
        userId: data.userId || '',
        totalAmount: String(price),
        kaporaAmount: kaporaTRY,
        commissionRate: String(COMMISSION_RATE),
      },
      ...(data.guestEmail ? { customer_email: data.guestEmail } : {}),
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      eventTitle: event.title,
      totalAmount: String(price),
      kaporaAmount: kaporaTRY,
      currency: event.currency,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CAMPAIGN CHECKOUT (Kampanya Satın Alma)
  // ═══════════════════════════════════════════════════════════

  /** Kampanya için Stripe Checkout session oluştur (kapora modeli) */
  async createCampaignCheckout(data: {
    campaignId: string;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    userId?: string;
  }) {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: data.campaignId },
      relations: ['tenant'],
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'active') throw new BadRequestException('Campaign is not active');
    if (campaign.actionType === 'lead_only') {
      throw new BadRequestException('Bu kampanya sadece bilgi formu üzerinden alınabilir');
    }

    // Fiyat: discountedPrice öncelikli, yoksa originalPrice
    const totalPrice = parseFloat(campaign.discountedPrice || campaign.originalPrice || '0');
    if (totalPrice <= 0) {
      throw new BadRequestException('Kampanya fiyatı tanımlı değil');
    }

    // Komisyon oranı (tenant bazlı)
    const COMMISSION_RATE = campaign.tenant ? parseFloat(campaign.tenant.commissionRate) : 0.15;

    const totalCents = Math.round(totalPrice * 100);
    const kaporaCents = Math.ceil(totalCents * COMMISSION_RATE);
    const kaporaTRY = (kaporaCents / 100).toFixed(2);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: `Kapora — ${campaign.title}`,
              description: `Kampanya: ${campaign.title} | Toplam: ${totalPrice}₺ · Kapora: ${kaporaTRY}₺`,
            },
            unit_amount: kaporaCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://www.wellnessclub.tech/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.wellnessclub.tech/booking-cancel`,
      metadata: {
        type: 'campaign',
        campaignId: campaign.id,
        tenantId: campaign.tenantId,
        guestName: data.guestName || '',
        guestPhone: data.guestPhone || '',
        guestEmail: data.guestEmail || '',
        userId: data.userId || '',
        totalAmount: String(totalPrice),
        kaporaAmount: kaporaTRY,
        commissionRate: String(COMMISSION_RATE),
      },
      ...(data.guestEmail ? { customer_email: data.guestEmail } : {}),
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      campaignTitle: campaign.title,
      totalAmount: String(totalPrice),
      kaporaAmount: kaporaTRY,
      currency: 'TRY',
    };
  }

  /** Stripe webhook'tan gelen kampanya ödeme onayını işle */
  async handleCampaignPaymentCompleted(session: {
    id: string;
    metadata: Record<string, string>;
    customer_details?: { email?: string };
  }) {
    const md = session.metadata;
    const campaignId = md.campaignId;
    const tenantId = md.tenantId;

    if (!campaignId || !tenantId) return { ok: false, error: 'missing campaign metadata' };

    const campaign = await this.campaignsRepo.findOne({
      where: { id: campaignId },
      relations: ['tenant'],
    });
    if (!campaign) return { ok: false, error: 'campaign not found' };

    const guestName = md.guestName || 'Misafir';
    const guestPhone = md.guestPhone || '';
    const guestEmail = (session.customer_details?.email || md.guestEmail || '').toLowerCase();

    // Kampanya kullanım sayısını artır
    campaign.redemptionCount = (campaign.redemptionCount || 0) + 1;
    await this.campaignsRepo.save(campaign);

    // Kullanıcı resolve
    const userId =
      md.userId || (await this.resolveGuestUserId(tenantId, guestEmail, guestName, guestPhone));

    // Bilet maili
    if (guestEmail) {
      try {
        await this.mailService.sendBookingConfirmation({
          to: guestEmail,
          guestName,
          clubName: campaign.tenant?.name || 'Wellness Club',
          serviceName: campaign.title,
          providerName: null,
          date: new Date().toISOString().slice(0, 10),
          startTime: '',
          endTime: '',
          totalAmount: md.totalAmount || '0',
          kaporaAmount: md.kaporaAmount || null,
          remainingAmount:
            md.totalAmount && md.kaporaAmount
              ? String((parseFloat(md.totalAmount) - parseFloat(md.kaporaAmount)).toFixed(0))
              : null,
          currency: 'TRY',
          appointmentId: `CMP-${campaignId.slice(0, 8)}`,
          cancellationDeadline: null,
        });
        this.logger.log(
          `Campaign confirmation email sent to ${guestEmail} for campaign ${campaignId}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send campaign confirmation email: ${msg}`);
      }
    }

    return { ok: true, campaignId, userId };
  }

  /** Stripe webhook'tan gelen event ödeme onayını işle */
  async handleEventPaymentCompleted(session: {
    id: string;
    metadata: Record<string, string>;
    customer_details?: { email?: string };
  }) {
    const md = session.metadata;
    const eventId = md.eventId;
    const tenantId = md.tenantId;

    if (!eventId || !tenantId) return { ok: false, error: 'missing event metadata' };

    const event = await this.eventsRepo.findOne({ where: { id: eventId } });
    if (!event) return { ok: false, error: 'event not found' };

    const guestName = md.guestName || 'Misafir';
    const guestPhone = md.guestPhone || '';
    const guestEmail = (session.customer_details?.email || md.guestEmail || '').toLowerCase();

    // Kullanıcı resolve
    const userId =
      md.userId || (await this.resolveGuestUserId(tenantId, guestEmail, guestName, guestPhone));

    // Zaten kayıtlı mı?
    const existing = await this.eventRegsRepo.findOne({ where: { clubEventId: eventId, userId } });
    if (existing) return { ok: true, duplicate: true };

    // Kapasite kontrolü
    const regCount = await this.eventRegsRepo.count({ where: { clubEventId: eventId } });
    if (regCount >= event.capacity) {
      this.logger.error(`Event ${eventId} full but payment received — manual refund needed`);
      return { ok: false, error: 'event full', requiresRefund: true };
    }

    // Kayıt oluştur
    await this.eventRegsRepo.insert({ clubEventId: eventId, userId });

    // Bilet maili gönder
    if (guestEmail) {
      try {
        const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
        const startDate = new Date(event.startsAt);
        const endDate = event.endsAt ? new Date(event.endsAt) : null;
        const cancellationDeadline = new Date(startDate.getTime() - 3 * 60 * 60 * 1000);

        await this.mailService.sendBookingConfirmation({
          to: guestEmail,
          guestName,
          clubName: tenant?.name || 'Wellness Club',
          serviceName: event.title,
          providerName: event.coachName,
          date: startDate.toISOString().slice(0, 10),
          startTime: startDate.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul',
          }),
          endTime: endDate
            ? endDate.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Istanbul',
              })
            : '',
          totalAmount: md.totalAmount || event.price,
          kaporaAmount: md.kaporaAmount || null,
          remainingAmount:
            md.totalAmount && md.kaporaAmount
              ? String((parseFloat(md.totalAmount) - parseFloat(md.kaporaAmount)).toFixed(0))
              : null,
          currency: event.currency,
          appointmentId: `EVT-${eventId.slice(0, 8)}`,
          cancellationDeadline: cancellationDeadline.toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
        this.logger.log(`Event confirmation email sent to ${guestEmail} for event ${eventId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send event confirmation email: ${msg}`);
      }
    }

    return { ok: true, eventId, userId };
  }

  // ═══════════════════════════════════════════════════════════
  // PACKAGE MANAGEMENT (Paket Kullanımı)
  // ═══════════════════════════════════════════════════════════

  /** Üyenin aktif paketlerini listele (mobil: hangi buton gösterilecek kararı için) */
  async listMyPackages(user: User) {
    const now = new Date().toISOString().slice(0, 10);
    const packages = await this.packagesRepo.find({
      where: { userId: user.id, status: PackageStatus.ACTIVE },
      relations: ['packageType', 'assignedTrainer', 'assignedTrainer.user'],
    });

    return packages
      .filter((p) => p.expiresAt >= now && p.remainingSessions > 0)
      .map((p) => ({
        id: p.id,
        packageTypeName: p.packageType?.name ?? '',
        sessionType: p.packageType?.sessionType ?? '',
        remainingSessions: p.remainingSessions,
        totalSessions: p.packageType?.sessionCount ?? 0,
        expiresAt: p.expiresAt,
        assignedTrainerId: p.assignedTrainerId,
        assignedTrainerName: p.assignedTrainer?.user
          ? `${p.assignedTrainer.user.firstName} ${p.assignedTrainer.user.lastName}`.trim()
          : null,
        tenantId: p.packageType?.tenantId ?? '',
      }));
  }

  /** Paketten seans düş + randevu oluştur (ödeme yok) */
  async usePackageForAppointment(user: User, data: { slotId: string; packageId: string }) {
    const pkg = await this.packagesRepo.findOne({
      where: { id: data.packageId, userId: user.id, status: PackageStatus.ACTIVE },
      relations: ['packageType'],
    });
    if (!pkg) throw new NotFoundException('Package not found or not active');
    if (pkg.remainingSessions <= 0) throw new BadRequestException('No remaining sessions');

    const now = new Date().toISOString().slice(0, 10);
    if (pkg.expiresAt < now) throw new BadRequestException('Package expired');

    const slot = await this.slotsRepo.findOne({
      where: { id: data.slotId },
      relations: ['service'],
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'available') throw new BadRequestException('Slot is not available');
    if (slot.bookedCount >= slot.capacity) throw new BadRequestException('Slot is full');

    // PT paketi: eğitmen eşleşmesi kontrolü
    if (pkg.packageType?.sessionType === SessionType.PERSONAL_TRAINING && pkg.assignedTrainerId) {
      if (slot.providerId !== pkg.assignedTrainerId) {
        throw new BadRequestException('Bu paket sadece atanmış eğitmeninizle kullanılabilir');
      }
    }

    // Aynı slot'a tekrar rezervasyon kontrolü
    const existing = await this.appointmentsRepo.findOne({
      where: { userId: user.id, slotId: data.slotId },
    });
    if (existing && existing.status !== 'cancelled') {
      throw new BadRequestException('You already have a reservation for this slot');
    }

    // Paketten seans düş
    const previousSessions = pkg.remainingSessions;
    pkg.remainingSessions -= 1;
    if (pkg.remainingSessions <= 0) {
      pkg.status = PackageStatus.DEPLETED;
    }
    await this.packagesRepo.save(pkg);

    // Appointment oluştur
    const appointment = this.appointmentsRepo.create({
      tenantId: slot.tenantId,
      userId: user.id,
      slotId: slot.id,
      serviceId: slot.serviceId,
      providerType: slot.providerType,
      providerId: slot.providerId,
      status: 'confirmed',
      totalAmount: '0',
      currency: slot.currency,
      paymentStatus: 'package',
      paymentMethod: 'package',
      packageId: pkg.id,
      notes: `Paket kullanımı: ${pkg.packageType?.name ?? 'Paket'} (${previousSessions} → ${pkg.remainingSessions})`,
      participantCount: 1,
    });
    const saved = await this.appointmentsRepo.save(appointment);

    // Slot güncelle
    await this.slotsRepo.increment({ id: slot.id }, 'bookedCount', 1);
    if (slot.bookedCount + 1 >= slot.capacity) {
      await this.slotsRepo.update({ id: slot.id }, { status: 'booked' });
    }

    // Bilet maili gönder
    if (user.email) {
      try {
        const tenant = await this.tenantsRepo.findOne({ where: { id: slot.tenantId } });
        let providerName: string | null = null;
        if (slot.providerId) {
          const trainer = await this.trainersRepo.findOne({
            where: { id: slot.providerId },
            relations: ['user'],
          });
          if (trainer?.user) {
            providerName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
          }
        }
        await this.mailService.sendBookingConfirmation({
          to: user.email,
          guestName: `${user.firstName} ${user.lastName}`.trim(),
          clubName: tenant?.name || 'Wellness Club',
          serviceName: slot.service?.name || 'Seans',
          providerName,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalAmount: '0',
          kaporaAmount: null,
          remainingAmount: null,
          currency: slot.currency,
          appointmentId: saved.id,
          cancellationDeadline: null,
        });
      } catch {
        // Mail hatası rezervasyonu engellemesin
      }
    }

    // SMS gönder
    if (user.phone) {
      const tenant = await this.tenantsRepo.findOne({ where: { id: slot.tenantId } });
      void this.smsService.send(
        user.phone,
        `Rezervasyonunuz onaylandi: ${slot.service?.name ?? 'Seans'} - ${slot.date} ${slot.startTime}. Kalan seans: ${pkg.remainingSessions}. ${tenant?.name ?? 'Wellness Club'}`,
      );
    }

    return {
      id: saved.id,
      status: 'confirmed',
      service: slot.service?.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      packageName: pkg.packageType?.name,
      previousSessions,
      remainingSessions: pkg.remainingSessions,
      paymentMethod: 'package',
    };
  }

  /**
   * Misafir kullanıcılar için deterministik kullanıcı kaydı:
   * - Email varsa o email ile member rolünde user oluştur (zaten varsa onu kullan).
   * - Email yoksa tenant başına global guest placeholder kullan.
   */
  private async resolveGuestUserId(
    tenantId: string,
    email: string,
    name: string,
    phone: string,
  ): Promise<string> {
    if (email) {
      // Bu email ile kullanıcı var mı?
      const existing = await this.usersRepo.findOne({ where: { email } });
      if (existing) return existing.id;

      // Yeni guest user oluştur — şifre yok, GUEST flag ile
      const [firstName, ...rest] = (name || 'Misafir').split(' ');
      // Username: email lokal kısmından + random suffix (unique constraint için)
      const localPart = email.split('@')[0].slice(0, 24);
      const suffix = Math.random().toString(36).slice(2, 8);
      const username = `${localPart}_${suffix}`.slice(0, 40);

      const newUser = this.usersRepo.create({
        tenantId,
        email,
        username,
        firstName: firstName || 'Misafir',
        lastName: rest.join(' ') || '',
        phone: phone || null,
        role: UserRole.MEMBER,
        passwordHash: '', // Login engellenmesi için boş — şifre sıfırlamadan giremez
        isGuest: true,
      } as Partial<User>);
      const saved = await this.usersRepo.save(newUser);
      return saved.id;
    }

    // Email de yok — tenant placeholder
    return '00000000-0000-0000-0000-000000000000';
  }

  // ═══════════════════════════════════════════════════════════
  // SCHEDULE SLOTS
  // ═══════════════════════════════════════════════════════════

  /** Public: Bir hizmetin müsait slotlarını getir */
  async listAvailableSlots(tenantSubdomain: string, serviceId: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const slots = await this.slotsRepo.find({
      where: { tenantId: tenant.id, serviceId, date, status: 'available' },
      order: { startTime: 'ASC' },
    });

    return slots
      .filter((s) => s.bookedCount < s.capacity)
      .map((s) => ({
        id: s.id,
        serviceId: s.serviceId,
        providerType: s.providerType,
        providerId: s.providerId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        remainingCapacity: s.capacity - s.bookedCount,
        price: s.price,
        currency: s.currency,
      }));
  }

  /** Public: Bir provider'ın (eğitmen/masöz) müsait slotlarını getir */
  async listProviderSlots(tenantSubdomain: string, providerId: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const slots = await this.slotsRepo.find({
      where: { tenantId: tenant.id, providerId, date, status: 'available' },
      relations: ['service'],
      order: { startTime: 'ASC' },
    });

    return slots
      .filter((s) => s.bookedCount < s.capacity)
      .map((s) => ({
        id: s.id,
        serviceId: s.serviceId,
        serviceName: s.service?.name ?? '',
        providerType: s.providerType,
        providerId: s.providerId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        remainingCapacity: s.capacity - s.bookedCount,
        price: s.price,
        currency: s.currency,
      }));
  }

  // ═══════════════════════════════════════════════════════════
  // COUPLES AVAILABILITY (Çift Kişilik Masaj)
  // ═══════════════════════════════════════════════════════════

  /**
   * Çift kişilik masaj müsaitliği:
   * Aynı saatte 2+ masöz müsait + çift kişilik oda boş olan saatleri döner.
   */
  async listCouplesAvailability(tenantSubdomain: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Masaj slotlarını getir (o tarih, available, massage kategorisi)
    const massageServices = await this.servicesRepo.find({
      where: { tenantId: tenant.id, category: 'massage', active: true },
    });
    if (massageServices.length === 0) return [];

    const serviceIds = massageServices.map((s) => s.id);

    const slots = await this.slotsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.service', 'svc')
      .where('s.tenantId = :tid', { tid: tenant.id })
      .andWhere('s.date = :date', { date })
      .andWhere('s.status = :status', { status: 'available' })
      .andWhere('s.serviceId IN (:...serviceIds)', { serviceIds })
      .andWhere('s.bookedCount < s.capacity')
      .orderBy('s.startTime', 'ASC')
      .getMany();

    // Saatlere göre grupla
    const byTime = new Map<string, typeof slots>();
    for (const slot of slots) {
      const key = slot.startTime;
      if (!byTime.has(key)) byTime.set(key, []);
      byTime.get(key)!.push(slot);
    }

    // Her saat için: 2+ farklı masöz müsait mi?
    const results: Array<{
      startTime: string;
      endTime: string;
      therapists: Array<{ id: string; name: string; slotId: string }>;
      totalPrice: number;
      currency: string;
    }> = [];

    for (const [startTime, timeSlots] of byTime.entries()) {
      // Farklı masözlerin slotları (providerId unique)
      const uniqueTherapists = new Map<string, (typeof timeSlots)[0]>();
      for (const s of timeSlots) {
        if (s.providerId && !uniqueTherapists.has(s.providerId)) {
          uniqueTherapists.set(s.providerId, s);
        }
      }

      if (uniqueTherapists.size >= 2) {
        // İlk 2 masözü al
        const therapistSlots = Array.from(uniqueTherapists.values()).slice(0, 2);
        const therapistNames: Array<{ id: string; name: string; slotId: string }> = [];

        for (const ts of therapistSlots) {
          let name = 'Masöz';
          if (ts.providerId) {
            const trainer = await this.trainersRepo.findOne({
              where: { id: ts.providerId },
              relations: ['user'],
            });
            if (trainer?.user) {
              name = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
            }
          }
          therapistNames.push({ id: ts.providerId!, name, slotId: ts.id });
        }

        const totalPrice = therapistSlots.reduce((sum, s) => sum + parseFloat(s.price), 0);

        results.push({
          startTime,
          endTime: therapistSlots[0].endTime,
          therapists: therapistNames,
          totalPrice,
          currency: therapistSlots[0].currency,
        });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // SPA ROOM AVAILABILITY (Oda Bazlı Masaj Sistemi)
  // ═══════════════════════════════════════════════════════════

  /**
   * Oda bazlı spa müsaitliği:
   * Her oda için saatleri döner, her saatte hangi masözlerin müsait olduğunu gösterir.
   * Çift oda: 2 masöz gerekli, Tek oda: 1 masöz gerekli.
   */
  async listSpaRoomAvailability(tenantSubdomain: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Masaj odalarını getir
    const rooms = await this.resourcesRepo.find({
      where: { tenantId: tenant.id, resourceType: 'massage_room', active: true },
      order: { sortOrder: 'ASC' },
    });
    if (rooms.length === 0) return { rooms: [], slots: [] };

    // Oda slotlarını getir (providerType: 'resource', resourceId: oda_id)
    const roomSlots = await this.slotsRepo
      .createQueryBuilder('s')
      .where('s.tenantId = :tid', { tid: tenant.id })
      .andWhere('s.date = :date', { date })
      .andWhere('s.providerType = :pt', { pt: 'resource' })
      .andWhere('s.resourceId IN (:...roomIds)', { roomIds: rooms.map((r) => r.id) })
      .andWhere('s.status = :status', { status: 'available' })
      .andWhere('s.bookedCount < s.capacity')
      .orderBy('s.startTime', 'ASC')
      .getMany();

    // Masöz slotlarını getir (providerType: 'trainer', category: massage)
    const massageServices = await this.servicesRepo.find({
      where: { tenantId: tenant.id, category: 'massage', active: true },
    });
    const massageServiceIds = massageServices.map((s) => s.id);

    let therapistSlots: ScheduleSlot[] = [];
    if (massageServiceIds.length > 0) {
      therapistSlots = await this.slotsRepo
        .createQueryBuilder('s')
        .where('s.tenantId = :tid', { tid: tenant.id })
        .andWhere('s.date = :date', { date })
        .andWhere('s.providerType = :pt', { pt: 'trainer' })
        .andWhere('s.serviceId IN (:...sids)', { sids: massageServiceIds })
        .andWhere('s.status = :status', { status: 'available' })
        .andWhere('s.bookedCount < s.capacity')
        .orderBy('s.startTime', 'ASC')
        .getMany();
    }

    // Masöz isimlerini çek
    const therapistIds = [...new Set(therapistSlots.map((s) => s.providerId).filter(Boolean))];
    const therapistMap = new Map<string, string>();
    for (const tid of therapistIds) {
      const trainer = await this.trainersRepo.findOne({
        where: { id: tid! },
        relations: ['user'],
      });
      if (trainer?.user) {
        therapistMap.set(tid!, `${trainer.user.firstName} ${trainer.user.lastName}`.trim());
      }
    }

    // Saatlere göre masöz slotlarını grupla
    const therapistsByTime = new Map<string, Array<{ id: string; slotId: string; name: string }>>();
    for (const ts of therapistSlots) {
      if (!ts.providerId) continue;
      const key = ts.startTime;
      if (!therapistsByTime.has(key)) therapistsByTime.set(key, []);
      therapistsByTime.get(key)!.push({
        id: ts.providerId,
        slotId: ts.id,
        name: therapistMap.get(ts.providerId) || 'Masöz',
      });
    }

    // Her oda slotu için müsait masözleri eşleştir
    const result = rooms.map((room) => {
      const roomSlotsForRoom = roomSlots.filter((s) => s.resourceId === room.id);
      const timeSlots = roomSlotsForRoom.map((rs) => {
        const availableTherapists = therapistsByTime.get(rs.startTime) || [];
        const requiredTherapists = room.capacity; // Çift oda: 2, Tek oda: 1
        const isBookable = availableTherapists.length >= requiredTherapists;

        return {
          roomSlotId: rs.id,
          startTime: rs.startTime,
          endTime: rs.endTime,
          price: rs.price,
          currency: rs.currency,
          isBookable,
          requiredTherapists,
          availableTherapists: availableTherapists.map((t) => ({
            id: t.id,
            slotId: t.slotId,
            name: t.name,
          })),
        };
      });

      return {
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
        roomType: room.capacity >= 2 ? 'couple' : 'single',
        price: room.price,
        currency: room.currency,
        timeSlots,
      };
    });

    return { rooms: result, date };
  }

  /**
   * Oda bazlı spa randevusu:
   * 1 oda slotu + N masöz slotu birlikte reserve edilir.
   * Çift oda: 2 masöz slotu, Tek oda: 1 masöz slotu.
   */
  async createSpaRoomAppointment(
    user: User,
    data: {
      roomSlotId: string;
      therapistSlotIds: string[];
      packageId?: string;
      notes?: string;
    },
  ) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can create appointments');
    }

    // Oda slotunu doğrula
    const roomSlot = await this.slotsRepo.findOne({
      where: { id: data.roomSlotId },
      relations: ['service'],
    });
    if (!roomSlot) throw new NotFoundException('Room slot not found');
    if (roomSlot.status !== 'available')
      throw new BadRequestException('Room slot is not available');
    if (roomSlot.bookedCount >= roomSlot.capacity) throw new BadRequestException('Room is full');

    // Oda bilgisini al
    const room = roomSlot.resourceId
      ? await this.resourcesRepo.findOne({ where: { id: roomSlot.resourceId } })
      : null;
    const requiredTherapists = room?.capacity ?? 1;

    if (data.therapistSlotIds.length < requiredTherapists) {
      throw new BadRequestException(`Bu oda için ${requiredTherapists} masöz seçilmelidir`);
    }

    // Masöz slotlarını doğrula
    const therapistSlots: ScheduleSlot[] = [];
    const therapistNames: string[] = [];
    for (const tsId of data.therapistSlotIds.slice(0, requiredTherapists)) {
      const ts = await this.slotsRepo.findOne({ where: { id: tsId }, relations: ['service'] });
      if (!ts) throw new NotFoundException(`Therapist slot not found: ${tsId}`);
      if (ts.status !== 'available') throw new BadRequestException(`Masöz slotu müsait değil`);
      if (ts.bookedCount >= ts.capacity) throw new BadRequestException(`Masöz slotu dolu`);
      if (ts.startTime !== roomSlot.startTime) {
        throw new BadRequestException('Masöz ve oda slotları aynı saatte olmalıdır');
      }
      therapistSlots.push(ts);

      // Masöz ismini al
      if (ts.providerId) {
        const trainer = await this.trainersRepo.findOne({
          where: { id: ts.providerId },
          relations: ['user'],
        });
        if (trainer?.user) {
          therapistNames.push(`${trainer.user.firstName} ${trainer.user.lastName}`.trim());
        }
      }
    }

    // Paket kontrolü
    let pkg: Package | null = null;
    let usedPackage = false;
    if (data.packageId) {
      pkg = await this.packagesRepo.findOne({
        where: { id: data.packageId, userId: user.id, status: PackageStatus.ACTIVE },
        relations: ['packageType'],
      });
      if (!pkg) throw new NotFoundException('Package not found or not active');
      const sessionsNeeded = requiredTherapists; // Çift masaj = 2 seans düşer
      if (pkg.remainingSessions < sessionsNeeded) {
        throw new BadRequestException(
          `Pakette yeterli seans yok (gerekli: ${sessionsNeeded}, kalan: ${pkg.remainingSessions})`,
        );
      }
      const now = new Date().toISOString().slice(0, 10);
      if (pkg.expiresAt < now) throw new BadRequestException('Package expired');
      usedPackage = true;
    }

    // Toplam fiyat: oda fiyatı + masöz fiyatları (paket kullanılıyorsa 0)
    const roomPrice = parseFloat(roomSlot.price);
    const therapistPrice = therapistSlots.reduce((sum, ts) => sum + parseFloat(ts.price), 0);
    const totalAmount = usedPackage ? 0 : roomPrice + therapistPrice;

    // Appointment oluştur (ana slot: oda slotu)
    const appointment = this.appointmentsRepo.create({
      tenantId: roomSlot.tenantId,
      userId: user.id,
      slotId: roomSlot.id,
      serviceId: roomSlot.serviceId,
      providerType: 'resource',
      providerId: roomSlot.resourceId,
      status: 'confirmed',
      totalAmount: String(totalAmount),
      currency: roomSlot.currency,
      paymentStatus: usedPackage ? 'package' : 'pending',
      paymentMethod: usedPackage ? 'package' : null,
      packageId: data.packageId ?? null,
      notes: data.notes
        ? data.notes
        : `${room?.name ?? 'Oda'} · ${therapistNames.join(' + ')} · ${roomSlot.startTime}-${roomSlot.endTime}`,
      participantCount: requiredTherapists,
      participants: therapistSlots.map((ts) => ({
        slotId: ts.id,
        providerId: ts.providerId,
        name: therapistNames[therapistSlots.indexOf(ts)] || 'Masöz',
      })),
    });
    const saved = await this.appointmentsRepo.save(appointment);

    // Oda slotunu reserve et
    await this.slotsRepo.increment({ id: roomSlot.id }, 'bookedCount', 1);
    if (roomSlot.bookedCount + 1 >= roomSlot.capacity) {
      await this.slotsRepo.update({ id: roomSlot.id }, { status: 'booked' });
    }

    // Masöz slotlarını reserve et
    for (const ts of therapistSlots) {
      await this.slotsRepo.increment({ id: ts.id }, 'bookedCount', 1);
      if (ts.bookedCount + 1 >= ts.capacity) {
        await this.slotsRepo.update({ id: ts.id }, { status: 'booked' });
      }
    }

    // Paketten seans düş
    if (usedPackage && pkg) {
      const sessionsUsed = requiredTherapists;
      pkg.remainingSessions -= sessionsUsed;
      if (pkg.remainingSessions <= 0) {
        pkg.status = PackageStatus.DEPLETED;
      }
      await this.packagesRepo.save(pkg);
    }

    // Bilet maili
    if (user.email) {
      try {
        const tenant = await this.tenantsRepo.findOne({ where: { id: roomSlot.tenantId } });
        await this.mailService.sendBookingConfirmation({
          to: user.email,
          guestName: `${user.firstName} ${user.lastName}`.trim(),
          clubName: tenant?.name || 'Wellness Club',
          serviceName: `${room?.name ?? 'Masaj Odası'} — ${therapistNames.join(' + ')}`,
          providerName: therapistNames.join(' + '),
          date: roomSlot.date,
          startTime: roomSlot.startTime,
          endTime: roomSlot.endTime,
          totalAmount: String(totalAmount),
          kaporaAmount: null,
          remainingAmount: null,
          currency: roomSlot.currency,
          appointmentId: saved.id,
          cancellationDeadline: null,
        });
      } catch {
        // Mail hatası rezervasyonu engellemesin
      }
    }

    return {
      id: saved.id,
      status: 'confirmed',
      room: room?.name ?? 'Masaj Odası',
      therapists: therapistNames,
      date: roomSlot.date,
      startTime: roomSlot.startTime,
      endTime: roomSlot.endTime,
      totalAmount: String(totalAmount),
      participantCount: requiredTherapists,
      paymentMethod: usedPackage ? 'package' : 'pending',
      remainingSessions: pkg?.remainingSessions ?? null,
      packageName: pkg?.packageType?.name ?? null,
    };
  }

  /** Admin: Toplu slot oluştur (belirli tarih aralığı, saat aralığı) */
  async generateSlots(
    tenantId: string,
    data: {
      serviceId: string;
      providerType: string;
      providerId?: string;
      resourceId?: string;
      startDate: string;
      endDate: string;
      startHour: number;
      endHour: number;
      durationMinutes?: number;
      price?: number;
    },
  ) {
    const service = await this.servicesRepo.findOne({ where: { id: data.serviceId, tenantId } });
    if (!service) throw new NotFoundException('Service not found');

    const duration = data.durationMinutes ?? service.durationMinutes;
    const price = data.price ?? parseFloat(service.price);
    const slotsToCreate: Partial<ScheduleSlot>[] = [];

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);

      for (let hour = data.startHour; hour < data.endHour; hour++) {
        const minuteSlots = Math.floor(60 / duration);
        for (let m = 0; m < minuteSlots; m++) {
          const startMin = m * duration;
          const endMin = startMin + duration;
          const startTime = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
          const endHour2 = hour + Math.floor(endMin / 60);
          const endMin2 = endMin % 60;
          const endTime = `${String(endHour2).padStart(2, '0')}:${String(endMin2).padStart(2, '0')}`;

          slotsToCreate.push({
            tenantId,
            serviceId: data.serviceId,
            providerType: data.providerType,
            providerId: data.providerId ?? null,
            resourceId: data.resourceId ?? service.resourceId ?? null,
            date: dateStr,
            startTime,
            endTime,
            capacity: service.capacity,
            bookedCount: 0,
            price: String(price),
            currency: service.currency,
            status: 'available',
          });
        }
      }
    }

    // Batch insert
    const batchSize = 500;
    let created = 0;
    for (let i = 0; i < slotsToCreate.length; i += batchSize) {
      const batch = slotsToCreate.slice(i, i + batchSize);
      await this.slotsRepo.save(batch as ScheduleSlot[]);
      created += batch.length;
    }

    return { created, serviceId: data.serviceId, dateRange: `${data.startDate} — ${data.endDate}` };
  }

  /**
   * Admin: Masaj odası için toplu slot oluştur.
   * Oda slotları providerType: 'resource' olarak oluşturulur.
   * Bir "Spa Oda" service_catalog kaydı yoksa otomatik oluşturulur.
   */
  async generateRoomSlots(
    tenantId: string,
    data: {
      roomId: string;
      startDate: string;
      endDate: string;
      startHour: number;
      endHour: number;
      durationMinutes?: number;
      price?: number;
    },
  ) {
    const room = await this.resourcesRepo.findOne({ where: { id: data.roomId, tenantId } });
    if (!room) throw new NotFoundException('Room not found');

    // Oda için service_catalog kaydı bul veya oluştur
    let service = await this.servicesRepo.findOne({
      where: { tenantId, resourceId: room.id, category: 'massage', active: true },
    });
    if (!service) {
      service = await this.servicesRepo.save(
        this.servicesRepo.create({
          tenantId,
          name: room.name,
          description: room.description,
          category: 'massage',
          providerType: 'resource',
          providerId: null,
          resourceId: room.id,
          durationMinutes: room.durationMinutes,
          price: String(room.price),
          currency: room.currency,
          capacity: 1, // Oda slotu: 1 seferde 1 grup
          active: true,
          metadata: { roomType: room.capacity >= 2 ? 'couple' : 'single' },
        }),
      );
    }

    const duration = data.durationMinutes ?? room.durationMinutes;
    const price = data.price ?? parseFloat(room.price);
    const slotsToCreate: Partial<ScheduleSlot>[] = [];

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);

      for (let hour = data.startHour; hour < data.endHour; hour++) {
        const minuteSlots = Math.floor(60 / duration);
        for (let m = 0; m < minuteSlots; m++) {
          const startMin = m * duration;
          const endMin = startMin + duration;
          const startTime = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
          const endHour2 = hour + Math.floor(endMin / 60);
          const endMin2 = endMin % 60;
          const endTime = `${String(endHour2).padStart(2, '0')}:${String(endMin2).padStart(2, '0')}`;

          slotsToCreate.push({
            tenantId,
            serviceId: service.id,
            providerType: 'resource',
            providerId: null,
            resourceId: room.id,
            date: dateStr,
            startTime,
            endTime,
            capacity: 1,
            bookedCount: 0,
            price: String(price),
            currency: room.currency,
            status: 'available',
          });
        }
      }
    }

    // Batch insert
    const batchSize = 500;
    let created = 0;
    for (let i = 0; i < slotsToCreate.length; i += batchSize) {
      const batch = slotsToCreate.slice(i, i + batchSize);
      await this.slotsRepo.save(batch as ScheduleSlot[]);
      created += batch.length;
    }

    return {
      created,
      roomId: room.id,
      roomName: room.name,
      dateRange: `${data.startDate} — ${data.endDate}`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ═══════════════════════════════════════════════════════════

  /** Üye: Randevu oluştur */
  async createAppointment(
    user: User,
    data: {
      slotId: string;
      notes?: string;
      packageId?: string;
      addons?: Array<{ addonId: string; quantity: number }>;
    },
  ) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can create appointments');
    }

    const slot = await this.slotsRepo.findOne({
      where: { id: data.slotId },
      relations: ['service'],
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'available') throw new BadRequestException('Slot is not available');
    if (slot.bookedCount >= slot.capacity) throw new BadRequestException('Slot is full');

    // Aynı slot'a tekrar rezervasyon kontrolü
    const existing = await this.appointmentsRepo.findOne({
      where: { userId: user.id, slotId: data.slotId, status: 'pending' },
    });
    if (existing) throw new BadRequestException('You already have a reservation for this slot');

    // Add-on toplam hesapla
    let addonTotal = 0;
    const addonDetails: Array<{ name: string; price: number; quantity: number }> = [];
    if (data.addons && data.addons.length > 0) {
      for (const item of data.addons) {
        const addon = await this.addonsRepo.findOne({
          where: { id: item.addonId, tenantId: slot.tenantId, active: true },
        });
        if (addon) {
          addonTotal += parseFloat(String(addon.price)) * item.quantity;
          addonDetails.push({
            name: addon.name,
            price: parseFloat(String(addon.price)),
            quantity: item.quantity,
          });
        }
      }
    }

    const totalAmount = parseFloat(slot.price) + addonTotal;

    // Appointment oluştur
    const appointment = this.appointmentsRepo.create({
      tenantId: slot.tenantId,
      userId: user.id,
      slotId: slot.id,
      serviceId: slot.serviceId,
      providerType: slot.providerType,
      providerId: slot.providerId,
      status: 'pending',
      totalAmount: String(totalAmount),
      currency: slot.currency,
      paymentStatus: 'pending',
      packageId: data.packageId ?? null,
      notes: data.notes ?? null,
      participantCount: 1,
      participants: addonDetails.length > 0 ? addonDetails : null,
    });
    const saved = await this.appointmentsRepo.save(appointment);

    // Slot booked_count artır
    await this.slotsRepo.increment({ id: slot.id }, 'bookedCount', 1);
    if (slot.bookedCount + 1 >= slot.capacity) {
      await this.slotsRepo.update({ id: slot.id }, { status: 'booked' });
    }

    return {
      id: saved.id,
      status: saved.status,
      service: slot.service?.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price,
      addons: addonDetails,
      totalAmount: String(totalAmount),
    };
  }

  /** Üye: Kendi randevularını listele */
  async listMyAppointments(user: User) {
    return this.appointmentsRepo.find({
      where: { userId: user.id },
      relations: ['service', 'slot'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** Üye: Randevu iptal */
  async cancelAppointment(user: User, appointmentId: string) {
    const appointment = await this.appointmentsRepo.findOne({
      where: { id: appointmentId, userId: user.id },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status === 'cancelled') throw new BadRequestException('Already cancelled');

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'user';
    await this.appointmentsRepo.save(appointment);

    // Slot'u tekrar available yap
    await this.slotsRepo.decrement({ id: appointment.slotId }, 'bookedCount', 1);
    await this.slotsRepo.update({ id: appointment.slotId }, { status: 'available' });

    return { ok: true, status: 'cancelled' };
  }

  /** Admin: Tenant'ın tüm randevularını listele */
  async listTenantAppointments(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    return this.appointmentsRepo.find({
      where,
      relations: ['user', 'service', 'slot'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Admin: Randevu durumunu güncelle */
  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: string,
    adminNote?: string,
  ) {
    const appointment = await this.appointmentsRepo.findOne({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    appointment.status = status;
    if (adminNote) appointment.adminNote = adminNote;
    if (status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = 'admin';
      // Slot'u geri aç
      await this.slotsRepo.decrement({ id: appointment.slotId }, 'bookedCount', 1);
      await this.slotsRepo.update({ id: appointment.slotId }, { status: 'available' });
    }

    return this.appointmentsRepo.save(appointment);
  }
}
