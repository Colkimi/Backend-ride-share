import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsNumber()
  @IsOptional()
  vehicle_id?: number;

  @ApiProperty({
    description: 'the make of the vehicle',
    example: 'Toyota',
  })
  @IsString()
  make: string;

  @ApiProperty({
    description: 'the model of the vehicle',
    example: 'Toyota corolla',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'year of the car model',
    example: 2020,
  })
  @IsNumber()
  year: number;

  @ApiProperty({
    description: 'license plate of the vehicle',
    example: 'KAA 123A',
  })
  @IsString()
  license_plate: string;

  @ApiProperty({
    description: 'color of the vehicle',
    example: 'black',
  })
  @IsString()
  color: string;

  @ApiProperty({
    description: 'the passenger capacity',
    example: 3,
  })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    description: 'the vehicle type',
    example: 'premium',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'verification status of the driver',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  approved?: boolean;
}
