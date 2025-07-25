import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class DriverPickupProgressDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNumber()
  bookingId: number;

  @ApiProperty({ description: 'Driver ID' })
  @IsNumber()
  driverId: number;

  @ApiProperty({ description: 'Current driver latitude' })
  @IsNumber()
  currentLatitude: number;

  @ApiProperty({ description: 'Current driver longitude' })
  @IsNumber()
  currentLongitude: number;

  @ApiProperty({ description: 'Distance to pickup location in meters' })
  @IsNumber()
  distanceToPickup: number;

  @ApiProperty({ description: 'Estimated time to pickup in minutes' })
  @IsNumber()
  estimatedTimeToPickup: number;

  @ApiProperty({ description: 'Current status of pickup journey' })
  @IsString()
  status: 'en_route' | 'approaching' | 'arrived' | 'waiting';

  @ApiProperty({ description: 'Last update timestamp', required: false })
  @IsOptional()
  @IsDateString()
  lastUpdate?: string;

  @ApiProperty({ description: 'Route instructions', required: false })
  @IsOptional()
  @IsString()
  routeInstructions?: string;
}

export class PickupConfirmationDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNumber()
  bookingId: number;

  @ApiProperty({ description: 'Driver ID' })
  @IsNumber()
  driverId: number;

  @ApiProperty({ description: 'Confirmation timestamp' })
  @IsDateString()
  pickupTime: string;

  @ApiProperty({ description: 'Actual pickup location latitude' })
  @IsNumber()
  pickupLatitude: number;

  @ApiProperty({ description: 'Actual pickup location longitude' })
  @IsNumber()
  pickupLongitude: number;
}

export class ETAUpdateDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNumber()
  bookingId: number;

  @ApiProperty({ description: 'Driver ID' })
  @IsNumber()
  driverId: number;

  @ApiProperty({ description: 'Updated ETA in minutes' })
  @IsNumber()
  etaMinutes: number;

  @ApiProperty({ description: 'Current distance in meters' })
  @IsNumber()
  distanceMeters: number;

  @ApiProperty({ description: 'Current status' })
  @IsString()
  status: string;
}
