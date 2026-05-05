import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(passwordRule, {
    message:
      'Password must be at least 8 characters and include uppercase, lowercase, and a number',
  })
  newPassword!: string;
}
