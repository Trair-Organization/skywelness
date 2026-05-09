import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { TicketController } from './ticket.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation])],
  controllers: [TicketController],
})
export class TicketModule {}
