import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantSubdomain?: string;
}
