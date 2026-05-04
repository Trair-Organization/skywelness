import { IsIn, IsOptional, IsString } from 'class-validator';

const TRAINER_FILTER = ['personal_training', 'massage'] as const;

export class TrainersQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(TRAINER_FILTER)
  sessionType?: (typeof TRAINER_FILTER)[number];
}
