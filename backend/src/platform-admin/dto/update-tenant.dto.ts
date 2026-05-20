import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsArray()
  services?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priceRange?: string | null;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  badges?: string[];
}
