import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CafeOrderItemDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  @IsInt()
  @Min(1)
  unitPrice!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateCafeOrderDto {
  @IsString()
  @MaxLength(120)
  customerName!: string;

  @IsString()
  @MaxLength(64)
  blockLabel!: string;

  @IsString()
  @MaxLength(64)
  apartmentLabel!: string;

  @IsString()
  @MaxLength(40)
  phoneNumber!: string;

  @IsIn(['cash', 'card'])
  paymentMethod!: 'cash' | 'card';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CafeOrderItemDto)
  items!: CafeOrderItemDto[];
}
