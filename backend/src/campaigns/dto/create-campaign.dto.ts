import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['massage_package', 'membership', 'personal_training', 'general'])
  campaignType!: 'massage_package' | 'membership' | 'personal_training' | 'general';

  @IsOptional()
  @IsIn(['active', 'draft', 'paused'])
  status?: 'active' | 'draft' | 'paused';

  @IsIn(['percentage', 'fixed'])
  discountKind!: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsIn(['everyone', 'new_members', 'existing_members'])
  audience?: 'everyone' | 'new_members' | 'existing_members';

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetDistrict?: string;
}
