import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MemberAccountStatus, UserRole } from '../../database/enums';

export class ManageUserDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(MemberAccountStatus)
  status?: MemberAccountStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
