import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const REQ_SESSION = ['personal_training', 'massage'] as const;

export class CreatePackageRequestDto {
  @IsIn(REQ_SESSION)
  sessionType!: (typeof REQ_SESSION)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsUUID('4')
  preferredTrainerId?: string;
}
