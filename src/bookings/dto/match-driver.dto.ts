import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchDriverDto {
  @ApiProperty({
    description: 'Booking ID to match with drivers',
    example: 123,
  })
  @IsNumber()
  bookingId: number;

  @ApiPropertyOptional({
    description: 'Maximum search radius in kilometers',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(50)
  maxRadiusKm?: number = 5;

  @ApiPropertyOptional({
    description: 'Maximum number of drivers to return',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxResults?: number = 10;
}

export class DriverMatchResponseDto {
  @ApiProperty({
    description: 'Driver ID',
    example: 456,
  })
  driverId: number;

  @ApiProperty({
    description: 'Driver current latitude',
    example: -1.2921,
  })
  latitude: number;

  @ApiProperty({
    description: 'Driver current longitude',
    example: 36.8219,
  })
  longitude: number;

  @ApiProperty({
    description: 'Distance to booking pickup point in kilometers',
    example: 1.5,
  })
  distance: number;

  @ApiProperty({
    description: 'Last location update timestamp',
    example: 1703123456789,
  })
  lastUpdate: number;

  @ApiProperty({
    description: 'Estimated time to pickup in minutes',
    example: 5,
  })
  estimatedTimeToPickup?: number;

  @ApiProperty({
    description: 'Step-by-step route instructions for the driver',
    example: ["1. Head west on Main Street (0.5km, ~2min)", "2. Turn left onto First Avenue (1.2km, ~3min)"]
  })
  routeInstructions?: string[];

  @ApiProperty({
    description: 'Total route distance in meters',
    example: 2100
  })
  totalDistance?: number;

  @ApiProperty({
    description: 'Total route duration in seconds',
    example: 300
  })
  totalDuration?: number;
}

export class AssignDriverDto {
  @ApiProperty({
    description: 'Booking ID to assign driver to',
    example: 123,
  })
  @IsNumber()
  bookingId: number;

  @ApiProperty({
    description: 'Driver ID to assign to booking',
    example: 456,
  })
  @IsNumber()
  driverId: number;
}
