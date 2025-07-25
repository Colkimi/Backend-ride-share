import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SeedUsersDto {
  @ApiPropertyOptional({ description: 'Number of customers to create', minimum: 0, maximum: 1000, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  customers?: number = 5;

  @ApiPropertyOptional({ description: 'Number of drivers to create', minimum: 0, maximum: 100, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  drivers?: number = 4;

  @ApiPropertyOptional({ description: 'Create associated driver profiles for driver users', default: true })
  @IsOptional()
  @IsBoolean()
  createDriverProfiles?: boolean = true;

  @ApiPropertyOptional({ description: 'Create associated payment methods for users', default: true })
  @IsOptional()
  @IsBoolean()
  createPaymentMethods?: boolean = true;
}

export class SeedDriversDto {
  @ApiPropertyOptional({ description: 'Number of drivers to create', minimum: 0, maximum: 100, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  count?: number = 4;

  @ApiPropertyOptional({ description: 'Create associated vehicles for drivers', default: true })
  @IsOptional()
  @IsBoolean()
  createVehicles?: boolean = true;

  @ApiPropertyOptional({ description: 'Set drivers as available by default', default: true })
  @IsOptional()
  @IsBoolean()
  setAvailable?: boolean = true;

  @ApiPropertyOptional({ description: 'Average rating for created drivers', minimum: 1, maximum: 5, default: 4.5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  averageRating?: number = 4.5;
}

export class SeedVehiclesDto {
  @ApiPropertyOptional({ description: 'Number of vehicles to create', minimum: 0, maximum: 100, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  count?: number = 4;

  @ApiPropertyOptional({ description: 'Create vehicles for existing drivers', default: true })
  @IsOptional()
  @IsBoolean()
  assignToDrivers?: boolean = true;

  @ApiPropertyOptional({ description: 'Vehicle makes to use', example: ['Toyota', 'Honda', 'Nissan'] })
  @IsOptional()
  makes?: string[] = ['Toyota', 'Honda', 'Nissan', 'Subaru'];

  @ApiPropertyOptional({ description: 'Vehicle types to use', example: ['Sedan', 'SUV', 'Hatchback'] })
  @IsOptional()
  types?: string[] = ['Sedan', 'SUV', 'Hatchback', 'MPV'];
}

export class SeedLocationsDto {
  @ApiPropertyOptional({ description: 'Number of locations to create per user', minimum: 1, maximum: 10, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  locationsPerUser?: number = 2;

  @ApiPropertyOptional({ description: 'Create home locations', default: true })
  @IsOptional()
  @IsBoolean()
  createHomeLocations?: boolean = true;

  @ApiPropertyOptional({ description: 'Create work locations', default: true })
  @IsOptional()
  @IsBoolean()
  createWorkLocations?: boolean = true;

  @ApiPropertyOptional({ description: 'Create custom locations', default: true })
  @IsOptional()
  @IsBoolean()
  createCustomLocations?: boolean = true;

  @ApiPropertyOptional({ description: 'Latitude range for generated locations', example: [-1.4, -1.2] })
  @IsOptional()
  latitudeRange?: [number, number] = [-1.4, -1.2];

  @ApiPropertyOptional({ description: 'Longitude range for generated locations', example: [36.6, 37.0] })
  @IsOptional()
  longitudeRange?: [number, number] = [36.6, 37.0];
}

export class SeedBookingsDto {
  @ApiPropertyOptional({ description: 'Number of bookings to create', minimum: 0, maximum: 1000, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  count?: number = 5;

  @ApiPropertyOptional({ description: 'Create bookings for existing users and drivers', default: true })
  @IsOptional()
  @IsBoolean()
  useExistingUsersAndDrivers?: boolean = true;

  @ApiPropertyOptional({ description: 'Distribution of booking statuses', example: { completed: 0.6, accepted: 0.2, in_progress: 0.2 } })
  @IsOptional()
  statusDistribution?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Average fare amount', minimum: 100, maximum: 10000, default: 350 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10000)
  @Type(() => Number)
  averageFare?: number = 350;

  @ApiPropertyOptional({ description: 'Create associated reviews for completed bookings', default: true })
  @IsOptional()
  @IsBoolean()
  createReviews?: boolean = true;
}

export class SeedReviewsDto {
  @ApiPropertyOptional({ description: 'Number of reviews to create', minimum: 0, maximum: 500, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  @Type(() => Number)
  count?: number = 3;

  @ApiPropertyOptional({ description: 'Create reviews for existing completed bookings', default: true })
  @IsOptional()
  @IsBoolean()
  useExistingBookings?: boolean = true;

  @ApiPropertyOptional({ description: 'Average rating', minimum: 1, maximum: 5, default: 4.5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  averageRating?: number = 4.5;

  @ApiPropertyOptional({ description: 'Include review comments', default: true })
  @IsOptional()
  @IsBoolean()
  includeComments?: boolean = true;
}

export class ClearDataDto {
  @ApiPropertyOptional({ description: 'Clear users data', default: false })
  @IsOptional()
  @IsBoolean()
  users?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear drivers data', default: false })
  @IsOptional()
  @IsBoolean()
  drivers?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear vehicles data', default: false })
  @IsOptional()
  @IsBoolean()
  vehicles?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear locations data', default: false })
  @IsOptional()
  @IsBoolean()
  locations?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear bookings data', default: false })
  @IsOptional()
  @IsBoolean()
  bookings?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear reviews data', default: false })
  @IsOptional()
  @IsBoolean()
  reviews?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear pricing data', default: false })
  @IsOptional()
  @IsBoolean()
  pricing?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear discounts data', default: false })
  @IsOptional()
  @IsBoolean()
  discounts?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear payment methods data', default: false })
  @IsOptional()
  @IsBoolean()
  paymentMethods?: boolean = false;

  @ApiPropertyOptional({ description: 'Clear all data (overrides individual settings)', default: false })
  @IsOptional()
  @IsBoolean()
  all?: boolean = false;
}
