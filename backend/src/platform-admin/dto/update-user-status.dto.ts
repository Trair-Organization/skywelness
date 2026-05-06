import { IsEnum } from 'class-validator';
import { MemberAccountStatus } from '../../database/enums';

export class UpdateUserStatusDto {
  @IsEnum(MemberAccountStatus)
  status!: MemberAccountStatus;
}
