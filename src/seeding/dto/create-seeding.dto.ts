import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsJSON, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SeedingStatus, SeedingType } from '../entities/seeding.entity';

export class CreateSeedingDto {
  @ApiProperty({ 
    description: 'Type of seeding operation to perform',
    enum: SeedingType,
    example: SeedingType.FULL
  })
  @IsEnum(SeedingType)
  type: SeedingType = SeedingType.FULL;

  @ApiPropertyOptional({ 
    description: 'Description of the seeding operation',
    example: 'Initial database seeding with test data'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Configuration parameters for the seeding operation',
    example: {
      users: { count: 10 },
      drivers: { count: 5 },
      vehicles: { count: 5 },
      includeReviews: true,
      includePaymentMethods: true
    }
  })
  @IsOptional()
  @IsJSON()
  config?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'User who initiated the seeding operation',
    example: 'admin@example.com'
  })
  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @ApiPropertyOptional({ 
    description: 'Environment where seeding is being performed',
    example: 'development'
  })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ 
    description: 'Whether this seeding operation can be rolled back',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isRollbackable?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Expected number of records to be created',
    minimum: 0,
    maximum: 10000,
    example: 100
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  @Type(() => Number)
  expectedRecordCount?: number;

  @ApiPropertyOptional({ 
    description: 'Parent seeding operation ID if this is a retry',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class SeedingConfigDto {
  @ApiPropertyOptional({ description: 'Number of users to create', minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  users?: number = 10;

  @ApiPropertyOptional({ description: 'Number of drivers to create', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  drivers?: number = 5;

  @ApiPropertyOptional({ description: 'Number of vehicles to create', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  vehicles?: number = 5;

  @ApiPropertyOptional({ description: 'Number of locations to create', minimum: 0, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  locations?: number = 20;

  @ApiPropertyOptional({ description: 'Number of bookings to create', minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  bookings?: number = 50;

  @ApiPropertyOptional({ description: 'Number of reviews to create', minimum: 0, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  reviews?: number = 25;

  @ApiPropertyOptional({ description: 'Number of pricing tiers to create', minimum: 0, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  pricing?: number = 3;

  @ApiPropertyOptional({ description: 'Number of discounts to create', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discounts?: number = 5;

  @ApiPropertyOptional({ description: 'Number of payment methods per user', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  paymentMethods?: number = 2;

  @ApiPropertyOptional({ description: 'Include relationships between entities', default: true })
  @IsOptional()
  @IsBoolean()
  includeRelationships?: boolean = true;

  @ApiPropertyOptional({ description: 'Clear existing data before seeding', default: true })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean = true;
}
