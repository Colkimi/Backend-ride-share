import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePricingDto {
  @ApiPropertyOptional({
    description: 'Pricing ID (auto-generated)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ description: 'Base fare', example: 5.0 })
  @IsNumber()
  basefare: number;

  @ApiProperty({ description: 'Cost per kilometer', example: 1.2 })
  @IsNumber()
  cost_per_km: number;

  @ApiProperty({ description: 'Cost per minute', example: 0.5 })
  @IsNumber()
  cost_per_minute: number;

  @ApiProperty({ description: 'Service fee', example: 2.0 })
  @IsNumber()
  service_fee: number;

  @ApiProperty({ description: 'Minimum fare', example: 10.0 })
  @IsNumber()
  minimum_fare: number;

  @ApiProperty({ description: 'Conditions multiplier', example: 1.5 })
  @IsNumber()
  conditions_multiplier: number;
}
