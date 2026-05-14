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
import { UserRole } from '../database/enums';
import { MailService } from '../mail/mail.service';

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
    private readonly mailService: MailService,
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

    return { ok: true, appointmentId: saved.id };
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
        remainingCapacity: s.capacity - s.bookedCount,
        price: s.price,
        currency: s.currency,
      }));
  }

  /** Admin: Toplu slot oluştur (belirli tarih aralığı, saat aralığı) */
  async generateSlots(
    tenantId: string,
    data: {
      serviceId: string;
      providerType: string;
      providerId?: string;
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
