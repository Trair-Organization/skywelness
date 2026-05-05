import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterPartnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  companyName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  contactName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(40)
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  clubCount?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
