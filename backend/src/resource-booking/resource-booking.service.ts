import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSlot } from '../database/entities/resource-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { Addon } from '../database/entities/addon.entity';
import { BookingAddon } from '../database/entities/booking-addon.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { PushService } from '../notifications/push.service';
import { SmsService } from '../notifications/sms.service';
import { MailService } from '../mail/mail.service';
import { emailShell, escapeHtml } from '../mail/mail-templates';
import { StripeService } from '../payments/stripe.service';
import { assertTenantBookingAccess } from './tenant-access.util';

@Injectable()
export class ResourceBookingService {
  constructor(
    @InjectRepository(Resource) private readonly resourceRepo: Repository<Resource>,
    @InjectRepository(ResourceSlot) private readonly slotRepo: Repository<ResourceSlot>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Addon) private readonly addonRepo: Repository<Addon>,
    @InjectRepository(BookingAddon) private readonly bookingAddonRepo: Repository<BookingAddon>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly pushService: PushService,
    private readonly smsService: SmsService,
    private readonly mailService: MailService,
    private readonly stripeService: StripeService,
  ) {}

  // ─── Public: Kullanıcı tarafı ───────────────────────────────────────────────

  /** Tenant'ın kaynaklarını listele (aktif) */
  async listResources(user: User, tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
    await assertTenantBookingAccess(user, tenant, this.usersRepo);
    const resources = await this.resourceRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      resourceType: r.resourceType,
      capacity: r.capacity,
      durationMinutes: r.durationMinutes,
      price: r.price,
      currency: r.currency,
      description: r.description,
      imageUrl: r.imageUrl,
    }));
  }

  /** Belirli bir kaynağın müsait slotlarını getir */
  async listAvailableSlots(user: User, tenantSubdomain: string, resourceId: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
    await assertTenantBookingAccess(user, tenant, this.usersRepo);
    const slots = await this.slotRepo.find({
      where: { tenantId: tenant.id, resourceId, date, status: 'available' },
      relations: ['resource'],
      order: { startTime: 'ASC' },
    });
    return slots.map((s) => ({
      id: s.id,
      resourceId: s.resourceId,
      resourceName: s.resource?.name ?? '',
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      price: s.price ?? s.resource?.price ?? '0',
      status: s.status,
    }));
  }

  /** Add-on'ları listele */
  async listAddons(user: User, tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
    await assertTenantBookingAccess(user, tenant, this.usersRepo);
    return this.addonRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Rezervasyon oluştur */
  async createBooking(
    user: User,
    tenantSubdomain: string,
    data: {
      resourceSlotId: string;
      participantCount?: number;
      participants?: Array<{ name: string; phone?: string }>;
      addons?: Array<{ addonId: string; quantity: number }>;
      notes?: string;
    },
  ) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
    await assertTenantBookingAccess(user, tenant, this.usersRepo);

    const slot = await this.slotRepo.findOne({
      where: { id: data.resourceSlotId, tenantId: tenant.id, status: 'available' },
      relations: ['resource'],
    });
    if (!slot) throw new BadRequestException('Bu slot müsait değil');

    // Calculate total
    const slotPrice = parseFloat(slot.price ?? slot.resource?.price ?? '0');
    let addonTotal = 0;
    const addonItems: Array<{
      addonId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (data.addons?.length) {
      for (const a of data.addons) {
        const addon = await this.addonRepo.findOne({
          where: { id: a.addonId, tenantId: tenant.id, active: true },
        });
        if (!addon) continue;
        const unitPrice = parseFloat(addon.price);
        const totalPrice = unitPrice * a.quantity;
        addonTotal += totalPrice;
        addonItems.push({ addonId: a.addonId, quantity: a.quantity, unitPrice, totalPrice });
      }
    }

    const totalAmount = slotPrice + addonTotal;

    // Create booking
    const booking = this.bookingRepo.create({
      tenantId: tenant.id,
      userId: user.id,
      resourceId: slot.resourceId,
      resourceSlotId: slot.id,
      status: 'confirmed',
      participantCount: data.participantCount ?? 1,
      participants: data.participants ?? null,
      totalAmount: totalAmount.toFixed(2),
      currency: slot.resource?.currency ?? 'TRY',
      paymentStatus: 'pending',
      notes: data.notes?.trim() || null,
    });
    await this.bookingRepo.save(booking);

    // Create booking addons
    for (const item of addonItems) {
      await this.bookingAddonRepo.save(
        this.bookingAddonRepo.create({
          bookingId: booking.id,
          addonId: item.addonId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        }),
      );
    }

    // Mark slot as booked
    slot.status = 'booked';
    await this.slotRepo.save(slot);

    // Notify user (push + SMS + mail)
    if (user.phone) {
      void this.smsService.send(
        user.phone,
        `Rezervasyonunuz onaylandi: ${slot.resource?.name} - ${slot.date} ${slot.startTime}. Toplam: ${totalAmount}₺. ${tenant.name}`,
      );
    }
    void this.pushService.sendToUser(
      user.id,
      '✅ Rezervasyon Onaylandı',
      `${slot.resource?.name} - ${slot.date} ${slot.startTime}`,
      { type: 'booking_confirmed', bookingId: booking.id },
    );

    // Email
    const html = emailShell({
      title: 'Rezervasyon Onaylandı',
      previewText: `${slot.resource?.name} - ${slot.date} ${slot.startTime}`,
      clubName: tenant.name,
      innerHtml: `
<p style="margin:0 0 16px;">Merhaba <strong>${escapeHtml(user.firstName)}</strong>,</p>
<p style="margin:0 0 16px;">Rezervasyonunuz başarıyla oluşturuldu.</p>
<div style="margin:20px 0;padding:18px;background:rgba(34,197,94,0.08);border-radius:12px;border:1px solid rgba(34,197,94,0.2);">
  <p style="margin:0;font-weight:700;color:#22c55e;">✅ Onaylandı</p>
  <p style="margin:8px 0 0;color:#1f2937;font-size:16px;font-weight:700;">🏟️ ${escapeHtml(slot.resource?.name ?? '')}</p>
  <p style="margin:4px 0 0;color:#1f2937;">📅 ${escapeHtml(slot.date)} · 🕐 ${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)}</p>
  <p style="margin:8px 0 0;color:#1f2937;font-weight:700;">💰 Toplam: ${totalAmount}₺</p>
</div>
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">İptal veya değişiklik için uygulamamızı kullanabilirsiniz.</p>`,
    });
    void this.mailService['send']({
      to: [user.email],
      subject: `${tenant.name} — Rezervasyon Onaylandı`,
      html,
      text: `Rezervasyonunuz onaylandi: ${slot.resource?.name} - ${slot.date} ${slot.startTime}. Toplam: ${totalAmount}₺`,
    }).catch(() => {});

    // Stripe checkout session (if Stripe is configured)
    let checkoutUrl: string | null = null;
    if (this.stripeService.isEnabled && totalAmount > 0) {
      const session = await this.stripeService.createCheckoutSession({
        bookingId: booking.id,
        amount: Math.round(totalAmount * 100), // TRY → kuruş
        currency: booking.currency,
        customerEmail: user.email,
        description: `${slot.resource?.name} - ${slot.date} ${slot.startTime}`,
        successUrl: `https://www.wellnessclub.tech/booking/success?bookingId=${booking.id}`,
        cancelUrl: `https://www.wellnessclub.tech/booking/cancel?bookingId=${booking.id}`,
        metadata: { tenantId: tenant.id, userId: user.id },
      });
      if (session) {
        booking.stripeSessionId = session.sessionId;
        await this.bookingRepo.save(booking);
        checkoutUrl = session.url;
      }
    }

    return {
      id: booking.id,
      resourceName: slot.resource?.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalAmount,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      checkoutUrl,
    };
  }

  /** Kullanıcının rezervasyonları */
  async listMyBookings(user: User, tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
    const bookings = await this.bookingRepo.find({
      where: { tenantId: tenant.id, userId: user.id },
      relations: ['resource', 'resourceSlot'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return bookings.map((b) => ({
      id: b.id,
      resourceName: b.resource?.name,
      date: b.resourceSlot?.date,
      startTime: b.resourceSlot?.startTime,
      endTime: b.resourceSlot?.endTime,
      totalAmount: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt,
    }));
  }

  // ─── Admin: Partner tarafı ──────────────────────────────────────────────────

  /** Admin: Tüm rezervasyonları listele */
  async listAllBookings(tenantId: string) {
    const bookings = await this.bookingRepo.find({
      where: { tenantId },
      relations: ['resource', 'resourceSlot', 'user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return bookings.map((b) => ({
      id: b.id,
      resourceName: b.resource?.name,
      date: b.resourceSlot?.date,
      startTime: b.resourceSlot?.startTime,
      endTime: b.resourceSlot?.endTime,
      totalAmount: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      participantCount: b.participantCount,
      userName: b.user ? `${b.user.firstName} ${b.user.lastName}`.trim() : '',
      userEmail: b.user?.email,
      userPhone: b.user?.phone,
      createdAt: b.createdAt,
    }));
  }

  /** Admin: Kaynak oluştur */
  async createResource(
    tenantId: string,
    data: {
      name: string;
      resourceType: string;
      capacity: number;
      durationMinutes: number;
      price: number;
      description?: string;
    },
  ) {
    const resource = this.resourceRepo.create({ tenantId, ...data, price: data.price.toFixed(2) });
    await this.resourceRepo.save(resource);
    return resource;
  }

  /** Admin: Slot oluştur (tekli veya toplu) */
  async createSlots(
    tenantId: string,
    data: {
      resourceId: string;
      date: string;
      slots: Array<{ startTime: string; endTime: string; price?: number }>;
    },
  ) {
    const created = [];
    for (const s of data.slots) {
      const slot = this.slotRepo.create({
        tenantId,
        resourceId: data.resourceId,
        date: data.date,
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price ? s.price.toFixed(2) : null,
        status: 'available',
      });
      await this.slotRepo.save(slot);
      created.push(slot);
    }
    return { created: created.length };
  }

  /** Admin: Add-on oluştur */
  async createAddon(tenantId: string, data: { name: string; price: number; description?: string }) {
    const addon = this.addonRepo.create({ tenantId, ...data, price: data.price.toFixed(2) });
    await this.addonRepo.save(addon);
    return addon;
  }

  /** Admin: Kaynakları listele */
  async listAdminResources(tenantId: string) {
    return this.resourceRepo.find({ where: { tenantId }, order: { sortOrder: 'ASC' } });
  }

  /** Admin: Add-on'ları listele */
  async listAdminAddons(tenantId: string) {
    return this.addonRepo.find({ where: { tenantId }, order: { sortOrder: 'ASC' } });
  }

  // ─── Rezervasyon Yönetimi ───────────────────────────────────────────────────

  /** Kullanıcı: Rezervasyon iptal */
  async cancelBooking(user: User, bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, userId: user.id },
      relations: ['resource', 'resourceSlot'],
    });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı');
    if (booking.status === 'cancelled') throw new BadRequestException('Zaten iptal edilmiş');

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    await this.bookingRepo.save(booking);

    // Free the slot
    if (booking.resourceSlotId) {
      await this.slotRepo.update({ id: booking.resourceSlotId }, { status: 'available' });
    }

    // Notify
    void this.pushService.sendToUser(
      user.id,
      '❌ Rezervasyon İptal',
      `${booking.resource?.name} rezervasyonunuz iptal edildi.`,
      { type: 'booking_cancelled' },
    );
    if (user.phone) {
      void this.smsService.send(
        user.phone,
        `Rezervasyonunuz iptal edildi: ${booking.resource?.name} - ${booking.resourceSlot?.date} ${booking.resourceSlot?.startTime}. Wellness Club`,
      );
    }

    return { ok: true, status: 'cancelled' };
  }

  /** Admin: Rezervasyon onayla */
  async adminApproveBooking(tenantId: string, bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, tenantId, status: 'pending' },
      relations: ['resource', 'resourceSlot', 'user'],
    });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı');

    booking.status = 'confirmed';
    await this.bookingRepo.save(booking);

    // Notify user
    if (booking.user) {
      void this.pushService.sendToUser(
        booking.userId,
        '✅ Rezervasyon Onaylandı',
        `${booking.resource?.name} - ${booking.resourceSlot?.date} ${booking.resourceSlot?.startTime}`,
        { type: 'booking_confirmed' },
      );
      if (booking.user.phone) {
        void this.smsService.send(
          booking.user.phone,
          `Rezervasyonunuz onaylandi: ${booking.resource?.name} - ${booking.resourceSlot?.date} ${booking.resourceSlot?.startTime}. Toplam: ${booking.totalAmount}TL`,
        );
      }
    }

    return { ok: true, status: 'confirmed' };
  }

  /** Admin: Rezervasyon reddet */
  async adminRejectBooking(tenantId: string, bookingId: string, reason?: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, tenantId },
      relations: ['resource', 'resourceSlot', 'user'],
    });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı');
    if (booking.status === 'cancelled') throw new BadRequestException('Zaten iptal edilmiş');

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    await this.bookingRepo.save(booking);

    // Free the slot
    if (booking.resourceSlotId) {
      await this.slotRepo.update({ id: booking.resourceSlotId }, { status: 'available' });
    }

    // Notify user
    if (booking.user) {
      const msg = reason
        ? `Rezervasyonunuz reddedildi. Sebep: ${reason}`
        : 'Rezervasyonunuz reddedildi.';
      void this.pushService.sendToUser(booking.userId, '❌ Rezervasyon Reddedildi', msg, {
        type: 'booking_rejected',
      });
      if (booking.user.phone) {
        void this.smsService.send(
          booking.user.phone,
          `Rezervasyonunuz reddedildi: ${booking.resource?.name} - ${booking.resourceSlot?.date} ${booking.resourceSlot?.startTime}. ${reason ?? ''}`,
        );
      }
    }

    return { ok: true, status: 'cancelled' };
  }

  /** Admin: Rezervasyon ileri tarihe al */
  async adminRescheduleBooking(tenantId: string, bookingId: string, newSlotId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, tenantId },
      relations: ['resource', 'resourceSlot', 'user'],
    });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı');
    if (booking.status === 'cancelled')
      throw new BadRequestException('İptal edilmiş rezervasyon taşınamaz');

    const newSlot = await this.slotRepo.findOne({
      where: { id: newSlotId, tenantId, status: 'available' },
    });
    if (!newSlot) throw new BadRequestException('Yeni slot müsait değil');

    // Free old slot
    if (booking.resourceSlotId) {
      await this.slotRepo.update({ id: booking.resourceSlotId }, { status: 'available' });
    }

    // Assign new slot
    const oldDate = booking.resourceSlot?.date;
    const oldTime = booking.resourceSlot?.startTime;
    booking.resourceSlotId = newSlot.id;
    booking.resourceId = newSlot.resourceId;
    await this.bookingRepo.save(booking);

    // Mark new slot as booked
    newSlot.status = 'booked';
    await this.slotRepo.save(newSlot);

    // Notify user
    if (booking.user) {
      void this.pushService.sendToUser(
        booking.userId,
        '📅 Rezervasyon Taşındı',
        `Yeni tarih: ${newSlot.date} ${newSlot.startTime}`,
        { type: 'booking_rescheduled' },
      );
      if (booking.user.phone) {
        void this.smsService.send(
          booking.user.phone,
          `Rezervasyonunuz tasindi: ${oldDate} ${oldTime} → ${newSlot.date} ${newSlot.startTime}. ${booking.resource?.name}`,
        );
      }
    }

    return { ok: true, newDate: newSlot.date, newTime: newSlot.startTime };
  }

  /** Admin: Kaynak güncelle (fiyat, isim, kapasite) */
  async updateResource(
    tenantId: string,
    resourceId: string,
    data: {
      name?: string;
      price?: number;
      capacity?: number;
      durationMinutes?: number;
      active?: boolean;
    },
  ) {
    const resource = await this.resourceRepo.findOne({ where: { id: resourceId, tenantId } });
    if (!resource) throw new NotFoundException('Kaynak bulunamadı');
    if (data.name !== undefined) resource.name = data.name;
    if (data.price !== undefined) resource.price = data.price.toFixed(2);
    if (data.capacity !== undefined) resource.capacity = data.capacity;
    if (data.durationMinutes !== undefined) resource.durationMinutes = data.durationMinutes;
    if (data.active !== undefined) resource.active = data.active;
    await this.resourceRepo.save(resource);
    return resource;
  }

  /** Admin: Add-on güncelle */
  async updateAddon(
    tenantId: string,
    addonId: string,
    data: { name?: string; price?: number; active?: boolean },
  ) {
    const addon = await this.addonRepo.findOne({ where: { id: addonId, tenantId } });
    if (!addon) throw new NotFoundException('Add-on bulunamadı');
    if (data.name !== undefined) addon.name = data.name;
    if (data.price !== undefined) addon.price = data.price.toFixed(2);
    if (data.active !== undefined) addon.active = data.active;
    await this.addonRepo.save(addon);
    return addon;
  }

  /** Admin: Slot sil */
  async deleteSlot(tenantId: string, slotId: string) {
    const slot = await this.slotRepo.findOne({ where: { id: slotId, tenantId } });
    if (!slot) throw new NotFoundException('Slot bulunamadı');
    if (slot.status === 'booked')
      throw new BadRequestException('Dolu slot silinemez. Önce rezervasyonu iptal edin.');
    await this.slotRepo.remove(slot);
    return { ok: true };
  }

  /** Admin: Belirli bir günün slotlarını listele */
  async listAdminSlots(tenantId: string, resourceId: string, date: string) {
    const slots = await this.slotRepo.find({
      where: { tenantId, resourceId, date },
      order: { startTime: 'ASC' },
    });
    return slots.map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      price: s.price,
      status: s.status,
    }));
  }
}
