import { IsUUID } from 'class-validator';

export class ConnectTrainerDto {
  @IsUUID('4')
  trainerId!: string;
}
