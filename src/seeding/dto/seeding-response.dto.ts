import { ApiProperty } from '@nestjs/swagger';
import { SeedingStatus, SeedingType } from '../entities/seeding.entity';

export class SeedingResponseDto {
  @ApiProperty({ description: 'Unique identifier for the seeding operation' })
  id: string;

  @ApiProperty({ description: 'Type of seeding operation', enum: SeedingType })
  type: SeedingType;

  @ApiProperty({ description: 'Current status of the seeding operation', enum: SeedingStatus })
  status: SeedingStatus;

  @ApiProperty({ description: 'Description of the seeding operation', required: false })
  description?: string;

  @ApiProperty({ description: 'Configuration parameters used', required: false })
  config?: Record<string, any>;

  @ApiProperty({ description: 'Results of the seeding operation', required: false })
  results?: Record<string, any>;

  @ApiProperty({ description: 'Error message if seeding failed', required: false })
  errorMessage?: string;

  @ApiProperty({ description: 'Number of records created during seeding' })
  recordCount: number;

  @ApiProperty({ description: 'When the seeding operation started', required: false })
  startedAt?: Date;

  @ApiProperty({ description: 'When the seeding operation completed', required: false })
  completedAt?: Date;

  @ApiProperty({ description: 'When the seeding record was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the seeding record was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'User who initiated the seeding operation', required: false })
  initiatedBy?: string;

  @ApiProperty({ description: 'Environment where seeding was performed', required: false })
  environment?: string;

  @ApiProperty({ description: 'Duration of the seeding operation in milliseconds', required: false })
  duration?: number;
}

export class SeedingStatsDto {
  @ApiProperty({ description: 'Total number of users in the database' })
  users: number;

  @ApiProperty({ description: 'Total number of drivers in the database' })
  drivers: number;

  @ApiProperty({ description: 'Total number of vehicles in the database' })
  vehicles: number;

  @ApiProperty({ description: 'Total number of locations in the database' })
  locations: number;

  @ApiProperty({ description: 'Total number of bookings in the database' })
  bookings: number;

  @ApiProperty({ description: 'Total number of reviews in the database' })
  reviews: number;

  @ApiProperty({ description: 'Total number of pricing tiers in the database' })
  pricing: number;

  @ApiProperty({ description: 'Total number of discounts in the database' })
  discounts: number;

  @ApiProperty({ description: 'Total number of payment methods in the database' })
  paymentMethods: number;
}

export class SeedingOperationDto {
  @ApiProperty({ description: 'Type of seeding operation', enum: SeedingType })
  type: SeedingType;

  @ApiProperty({ description: 'Status of the operation', enum: SeedingStatus })
  status: SeedingStatus;

  @ApiProperty({ description: 'Number of records processed' })
  processed: number;

  @ApiProperty({ description: 'Number of records created' })
  created: number;

  @ApiProperty({ description: 'Number of records updated' })
  updated: number;

  @ApiProperty({ description: 'Number of errors encountered' })
  errors: number;

  @ApiProperty({ description: 'Detailed results by entity type' })
  details: Record<string, any>;
}
