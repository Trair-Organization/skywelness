import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { ReservationStatus, SessionType } from '../database/enums';

@Controller('ticket')
export class TicketController {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
  ) {}

  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async getTicket(@Param('id') id: string): Promise<string> {
    const reservation = await this.reservationsRepo.findOne({
      where: { id },
      relations: ['user', 'trainer', 'trainer.user'],
    });

    if (!reservation) throw new NotFoundException('Bilet bulunamadı');

    const memberName = reservation.user
      ? `${reservation.user.firstName} ${reservation.user.lastName}`
      : 'Üye';
    const trainerName = reservation.trainer?.user
      ? `${reservation.trainer.user.firstName} ${reservation.trainer.user.lastName}`
      : '-';
    const date = reservation.startTime.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const startTime = reservation.startTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTime = reservation.endTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const sessionLabel =
      reservation.sessionType === SessionType.PERSONAL_TRAINING ? 'Personal Training' : 'Masaj';
    const statusLabel =
      reservation.status === ReservationStatus.CONFIRMED
        ? '✅ Onaylandı'
        : reservation.status === ReservationStatus.PENDING
          ? '⏳ Onay Bekliyor'
          : reservation.status === ReservationStatus.CANCELLED
            ? '❌ İptal Edildi'
            : reservation.status;
    const statusClass =
      reservation.status === ReservationStatus.CANCELLED
        ? 'cancelled'
        : reservation.status === ReservationStatus.PENDING
          ? 'pending'
          : '';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Randevu Bileti — Skyland Wellness</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .ticket { background: #fff; border-radius: 20px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .ticket-header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 28px 24px; text-align: center; }
    .ticket-logo { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .ticket-logo span { color: #fbbf24; }
    .ticket-type { color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .ticket-body { padding: 28px 24px; }
    .ticket-status { text-align: center; font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; padding: 10px; border-radius: 10px; background: #f0fdf4; color: #16a34a; }
    .ticket-status.cancelled { background: #fef2f2; color: #dc2626; }
    .ticket-status.pending { background: #fffbeb; color: #d97706; }
    .ticket-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .ticket-row:last-child { border-bottom: none; }
    .ticket-label { color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .ticket-value { color: #1e293b; font-weight: 700; font-size: 0.95rem; text-align: right; }
    .ticket-footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 2px dashed #e2e8f0; }
    .ticket-footer p { color: #94a3b8; font-size: 0.75rem; }
    .ticket-qr { margin-top: 12px; font-size: 0.7rem; color: #cbd5e1; font-family: monospace; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="ticket-logo">Skyland <span>Wellness</span> Club</div>
      <div class="ticket-type">${sessionLabel} Randevu Bileti</div>
    </div>
    <div class="ticket-body">
      <div class="ticket-status ${statusClass}">${statusLabel}</div>
      <div class="ticket-row">
        <span class="ticket-label">Üye</span>
        <span class="ticket-value">${memberName}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Eğitmen</span>
        <span class="ticket-value">${trainerName}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Tarih</span>
        <span class="ticket-value">${date}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Saat</span>
        <span class="ticket-value">${startTime} - ${endTime}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Tür</span>
        <span class="ticket-value">${sessionLabel}</span>
      </div>
    </div>
    <div class="ticket-footer">
      <p>Bu bilet randevunuzun onay belgesidir.</p>
      <p>Lütfen randevu saatinden 10 dk önce kulüpte olunuz.</p>
      <div class="ticket-qr">ID: ${reservation.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>
</body>
</html>`;
  }
}
