import { IsUUID } from 'class-validator';

export class JoinWaitingListDto {
  @IsUUID('4')
  timeSlotId!: string;
}
