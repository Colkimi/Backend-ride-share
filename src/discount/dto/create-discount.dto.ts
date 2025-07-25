import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum ApplicableTo {
  ALL_USERS = 'all_users',
  SPECIFIC_USERS = 'specific_users',
}

export class CreateDiscountDto {
  @ApiPropertyOptional({
    description: 'Discount ID (auto-generated)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ description: 'Discount code', example: 'SUMMER21' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Discount type',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @ApiProperty({ description: 'Discount value', example: 10 })
  @IsInt()
  @Min(0)
  discount_value: number;

  @ApiProperty({
    description: 'Expiry date of the discount',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  expiry_date: string;

  @ApiProperty({ description: 'Maximum number of uses', example: 100 })
  @IsInt()
  @Min(0)
  maximum_uses: number;

  @ApiPropertyOptional({ description: 'Current number of uses', example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  current_uses?: number;

  @ApiProperty({
    description: 'Applicable to',
    enum: ApplicableTo,
    example: ApplicableTo.ALL_USERS,
  })
  @IsEnum(ApplicableTo)
  applicableTo: ApplicableTo;
}
