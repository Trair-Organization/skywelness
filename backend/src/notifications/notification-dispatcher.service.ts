import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly push: PushService,
    private readonly sms: SmsService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  /** Üye onaylandığında */
  async memberApproved(user: User) {
    const title = '✅ Üyeliğiniz Onaylandı';
    const body = `Merhaba ${user.firstName}, Skyland Wellness Club üyeliğiniz onaylandı!`;
    await this.push.sendToUser(user.id, title, body);
    if (user.phone) await this.sms.sendMemberApproved(user.phone, user.firstName);
    this.logger.log(`[NOTIFY] memberApproved → ${user.email}`);
  }

  /** Randevu oluşturuldu (üyeye) */
  async reservationCreatedForMember(params: {
    member: User;
    trainerName: string;
    date: string;
    time: string;
    sessionType: string;
    reservationId?: string;
  }) {
    const typeLabel = params.sessionType === 'personal_training' ? 'PT' : 'Masaj';
    const title = '📅 Randevunuz Oluşturuldu';
    const body = `${params.date} ${params.time} — ${params.trainerName} (${typeLabel})`;
    await this.push.sendToUser(params.member.id, title, body);
    if (params.member.phone)
      await this.sms.sendReservationConfirmed(
        params.member.phone,
        params.trainerName,
        params.date,
        params.time,
        params.reservationId,
      );
    this.logger.log(`[NOTIFY] reservationCreated → ${params.member.email}`);
  }

  /** Randevu iptal (üyeye) */
  async reservationCancelledForMember(params: {
    member: User;
    trainerName: string;
    date: string;
    time: string;
  }) {
    const title = '❌ Randevunuz İptal Edildi';
    const body = `${params.date} ${params.time} randevunuz iptal edildi.`;
    await this.push.sendToUser(params.member.id, title, body);
    if (params.member.phone)
      await this.sms.sendReservationCancelled(params.member.phone, params.date, params.time);
    this.logger.log(`[NOTIFY] reservationCancelled → ${params.member.email}`);
  }

  /** Randevu taşındı (üyeye) */
  async reservationRescheduledForMember(params: {
    member: User;
    trainerName: string;
    newDate: string;
    newTime: string;
  }) {
    const title = '🔄 Randevunuz Güncellendi';
    const body = `Yeni: ${params.newDate} ${params.newTime}`;
    await this.push.sendToUser(params.member.id, title, body);
    if (params.member.phone)
      await this.sms.send(
        params.member.phone,
        `Randevunuz guncellendi: ${params.newDate} ${params.newTime}. Skyland Wellness`,
      );
    this.logger.log(`[NOTIFY] reservationRescheduled → ${params.member.email}`);
  }

  /** Paket atandı (üyeye) */
  async packageAssignedToMember(member: User, packageName: string) {
    const title = '📦 Yeni Paket Tanımlandı';
    const body = `${packageName} paketiniz tanımlanmıştır.`;
    await this.push.sendToUser(member.id, title, body);
    if (member.phone) await this.sms.sendPackageAssigned(member.phone, packageName);
    this.logger.log(`[NOTIFY] packageAssigned → ${member.email}`);
  }

  /** Yeni randevu (eğitmene) */
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

  /** Randevu iptal (eğitmene) */
  async bookingCancelledForTrainer(params: {
    trainerUserId: string;
    memberName: string;
    date: string;
    time: string;
  }) {
    const title = '❌ Randevu İptal';
    const body = `${params.memberName} — ${params.date} ${params.time} iptal.`;
    await this.push.sendToUser(params.trainerUserId, title, body);
    this.logger.log(`[NOTIFY] bookingCancelled → trainer ${params.trainerUserId}`);
  }

  /** Yeni üye kaydı (kulüp sahibine) */
  async newMemberRegistration(tenantId: string, memberName: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '👤 Yeni Üye', `${memberName} başvuru yaptı.`);
  }

  /** Yeni randevu (kulüp sahibine) */
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

  /** Randevu iptal (kulüp sahibine) */
  async bookingCancelledForClub(tenantId: string, memberName: string, date: string, time: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '❌ İptal', `${memberName} ${date} ${time}`);
  }

  /** Spa talebi (kulüp sahibine) */
  async spaBookingRequest(tenantId: string, memberName: string, serviceName: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '🧖 Spa Talebi', `${memberName} — ${serviceName}`);
  }

  /** Etkinlik katılımı (kulüp sahibine) */
  async eventJoined(tenantId: string, memberName: string, eventTitle: string) {
    const admins = await this.usersRepo.find({ where: { tenantId, role: UserRole.ADMINISTRATOR } });
    for (const a of admins)
      await this.push.sendToUser(a.id, '📅 Katılım', `${memberName} — ${eventTitle}`);
  }
}
