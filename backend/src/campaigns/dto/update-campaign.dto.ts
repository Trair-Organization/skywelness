import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(['massage_package', 'membership', 'personal_training', 'general'])
  campaignType?: 'massage_package' | 'membership' | 'personal_training' | 'general';

  @IsOptional()
  @IsIn(['active', 'draft', 'paused', 'expired'])
  status?: 'active' | 'draft' | 'paused' | 'expired';

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountKind?: 'percentage' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsIn(['everyone', 'new_members', 'existing_members'])
  audience?: 'everyone' | 'new_members' | 'existing_members';

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  featured?: boolean;
}
