import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTrainerApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
