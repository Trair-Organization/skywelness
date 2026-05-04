import { IsISO8601, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID('4')
  trainerId!: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
