import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsIn(['club', 'trainer', 'campaign', 'event'])
  source!: 'club' | 'trainer' | 'campaign' | 'event';

  @IsOptional()
  @IsString()
  sourceRef?: string;

  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @IsOptional()
  @IsString()
  clubSubdomain?: string;
}
