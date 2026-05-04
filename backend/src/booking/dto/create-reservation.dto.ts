import { IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID('4')
  timeSlotId!: string;

  @IsUUID('4')
  packageId!: string;
}
