import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status } from '../entities/driver.entity';

export class CreateDriverDto {
  @IsNumber()
  @IsOptional()
  driver_id?: number;

  @ApiProperty({
    description: 'User ID of the driver',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'license number of the driver',
    example: 1234567891,
  })
  @IsNumber()
  license_number: number;

  @ApiProperty({
    description: 'rating of the driver',
    example: 4.0,
  })
  @IsNumber()
  rating: number;

  @ApiProperty({
    description: 'verification status of the driver',
    example: Status.Unverified,
  })
  @IsString()
  @IsNotEmpty()
  verification_status: Status;

  @ApiProperty({
    description: 'total trips of the driver',
    example: 4.0,
  })
  @IsNumber()
  total_trips: number;

  @ApiProperty({
    description: 'availability status of the driver',
    example: true,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 36.8219,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -1.2921,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  longitude: number;
}
