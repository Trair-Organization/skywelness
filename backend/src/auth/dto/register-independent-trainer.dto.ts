import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;
const trainerSessionTypes = ['personal_training', 'massage'] as const;

export class RegisterIndependentTrainerDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9çğıöşü_.-]+$/, {
    message:
      'Username can include lowercase letters (including Turkish), numbers, dot, underscore, and hyphen only',
  })
  username!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(passwordRule, {
    message:
      'Password must be at least 8 characters and include uppercase, lowercase, and a number',
  })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  bio!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  specialties!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsUrl({ require_tld: false }, { each: true })
  @IsArray()
  @ArrayMaxSize(10)
  socialLinks?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pricingNote?: string;

  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(trainerSessionTypes, { each: true })
  offersSessionTypes!: (typeof trainerSessionTypes)[number][];
}
