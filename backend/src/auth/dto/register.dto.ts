import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

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
  @MaxLength(100)
  tenantSubdomain!: string;
}
