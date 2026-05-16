import { IsOptional, IsUUID, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceTypeFilter {
  MASSAGE = 'massage',
  PERSONAL_TRAINING = 'personal_training',
  PADEL = 'padel',
  CAFE = 'cafe',
  EVENT = 'event',
}

export class TransactionFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(ServiceTypeFilter)
  serviceType?: ServiceTypeFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
