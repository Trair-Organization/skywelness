import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTrainerMemberNoteDto {
  @IsUUID('4')
  memberUserId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  note!: string;
}
