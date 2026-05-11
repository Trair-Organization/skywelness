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
  ) {}

  // ─── Public: Kullanıcı tarafı ───────────────────────────────────────────────

  /** Tenant'ın kaynaklarını listele (aktif) */
  async listResources(tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
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
  async listAvailableSlots(tenantSubdomain: string, resourceId: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
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
  async listAddons(tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tesis bulunamadı');
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

    const slot = await this.slotRepo.findOne({
      where: { id: data.resourceSlotId, tenantId: tenant.id, status: 'available' },
      relations: ['resource'],
    });
    if (!slot) throw new BadRequestException('Bu slot müsait değil');

    // Calculate total
    const slotPrice = parseFloat(slot.price ?? slot.resource?.price ?? '0');
    let addonTotal = 0;
    const addonItems: Array<{ addonId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];

    if (data.addons?.length) {
      for (const a of data.addons) {
        const addon = await this.addonRepo.findOne({ where: { id: a.addonId, tenantId: tenant.id, active: true } });
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
      await this.bookingAddonRepo.save(this.bookingAddonRepo.create({
        bookingId: booking.id,
        addonId: item.addonId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: item.totalPrice.toFixed(2),
      }));
    }

    // Mark slot as booked
    slot.status = 'booked';
    await this.slotRepo.save(slot);

    // Notify user
    if (user.phone) {
      void this.smsService.send(user.phone, `Rezervasyonunuz onaylandi: ${slot.resource?.name} - ${slot.date} ${slot.startTime}. Toplam: ${totalAmount}₺. ${tenant.name}`);
    }
    void this.pushService.sendToUser(user.id, '✅ Rezervasyon Onaylandı', `${slot.resource?.name} - ${slot.date} ${slot.startTime}`, { type: 'booking_confirmed', bookingId: booking.id });

    return {
      id: booking.id,
      resourceName: slot.resource?.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalAmount,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
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
  async createResource(tenantId: string, data: { name: string; resourceType: string; capacity: number; durationMinutes: number; price: number; description?: string }) {
    const resource = this.resourceRepo.create({ tenantId, ...data, price: data.price.toFixed(2) });
    await this.resourceRepo.save(resource);
    return resource;
  }

  /** Admin: Slot oluştur (tekli veya toplu) */
  async createSlots(tenantId: string, data: { resourceId: string; date: string; slots: Array<{ startTime: string; endTime: string; price?: number }> }) {
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
}
