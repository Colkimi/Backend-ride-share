import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSeedingDto } from './create-seeding.dto';
import { SeedingStatus } from '../entities/seeding.entity';

export class UpdateSeedingDto extends PartialType(CreateSeedingDto) {
  @ApiPropertyOptional({ 
    description: 'Updated status of the seeding operation',
    enum: SeedingStatus,
    example: 'completed'
  })
  @IsOptional()
  @IsEnum(SeedingStatus)
  status?: SeedingStatus;

  @ApiPropertyOptional({ 
    description: 'Results of the seeding operation',
    example: {
      usersCreated: 10,
      driversCreated: 5,
      vehiclesCreated: 5,
      totalRecords: 20
    }
  })
  @IsOptional()
  results?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Error message if seeding failed',
    example: 'Failed to create users: Database connection error'
  })
  @IsOptional()
  errorMessage?: string;

  @ApiPropertyOptional({ 
    description: 'Actual number of records created',
    minimum: 0,
    example: 20
  })
  @IsOptional()
  recordCount?: number;
}
