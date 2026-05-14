import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCatalog } from '../database/entities/service-catalog.entity';
import { ScheduleSlot } from '../database/entities/schedule-slot.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Addon } from '../database/entities/addon.entity';
import { UserRole } from '../database/enums';

@Injectable()
export class UnifiedBookingService {
  constructor(
    @InjectRepository(ServiceCatalog) private readonly servicesRepo: Repository<ServiceCatalog>,
    @InjectRepository(ScheduleSlot) private readonly slotsRepo: Repository<ScheduleSlot>,
    @InjectRepository(Appointment) private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Addon) private readonly addonsRepo: Repository<Addon>,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // SERVICE CATALOG
  // ═══════════════════════════════════════════════════════════

  /** Public: Bir tenant'ın aktif hizmetlerini listele */
  async listServices(tenantSubdomain: string, category?: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const qb = this.servicesRepo.createQueryBuilder('s')
      .where('s.tenantId = :tid', { tid: tenant.id })
      .andWhere('s.active = true')
      .orderBy('s.sortOrder', 'ASC');

    if (category) {
      qb.andWhere('s.category = :category', { category });
    }

    const services = await qb.getMany();

    // Provider bilgilerini ekle
    const result = await Promise.all(services.map(async (s) => {
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
    }));

    return result;
  }

  /** Admin: Hizmet oluştur */
  async createService(tenantId: string, data: {
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
  }) {
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
      .filter(s => s.bookedCount < s.capacity)
      .map(s => ({
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
      .filter(s => s.bookedCount < s.capacity)
      .map(s => ({
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
  async generateSlots(tenantId: string, data: {
    serviceId: string;
    providerType: string;
    providerId?: string;
    startDate: string;
    endDate: string;
    startHour: number;
    endHour: number;
    durationMinutes?: number;
    price?: number;
  }) {
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
  async createAppointment(user: User, data: { slotId: string; notes?: string; packageId?: string; addons?: Array<{ addonId: string; quantity: number }> }) {
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
        const addon = await this.addonsRepo.findOne({ where: { id: item.addonId, tenantId: slot.tenantId, active: true } });
        if (addon) {
          addonTotal += parseFloat(String(addon.price)) * item.quantity;
          addonDetails.push({ name: addon.name, price: parseFloat(String(addon.price)), quantity: item.quantity });
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
      participants: addonDetails.length > 0 ? addonDetails as unknown as unknown[] : null,
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
  async updateAppointmentStatus(tenantId: string, appointmentId: string, status: string, adminNote?: string) {
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
