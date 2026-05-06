import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignTrainerTenantDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
