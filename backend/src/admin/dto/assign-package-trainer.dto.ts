import { IsOptional, IsUUID } from 'class-validator';

export class AssignPackageTrainerDto {
  /** Null/undefined clears trainer lock; UUID locks package to that trainer. */
  @IsOptional()
  @IsUUID('4')
  trainerId?: string | null;
}
