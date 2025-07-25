import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Status } from '../entities/booking.entity';
import { Column } from 'typeorm';

export class CreateBookingDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: 'Start latitude of the user',
    example: 49.41461,
  })
  @IsNotEmpty()
  @IsNumber()
  start_latitude: number;

  @ApiProperty({
    description: 'Start longitude of the user',
    example: 8.681495,
  })
  @IsNotEmpty()
  @IsNumber()
  start_longitude: number;

  @ApiProperty({
    description: 'End latitude of the user',
    example: 49.420318,
  })
  @IsNotEmpty()
  @IsNumber()
  end_latitude: number;

  @ApiProperty({
    description: 'End longitude of the user',
    example: 8.687872,
  })
  @IsNotEmpty()
  @IsNumber()
  end_longitude: number;

  @ApiProperty({
    description: 'pickup time',
    example: '2025-07-02T19:00:00.000Z',
  })
  @IsNotEmpty()
  pickup_time: Date;

  @ApiProperty({
    description: 'dropoff time',
    example: '2025-07-02T20:00:00.000Z',
  })
  dropoff_time: Date;

  @ApiPropertyOptional({
    description: 'status of the ride',
    example: 'requested',
  })
  @IsOptional()
  status?: Status;

  @IsOptional()
  @IsNumber()
  fare?: number;

  @IsOptional()
  @IsNumber()
  distance?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Pricing rule ID', example: 2 })
  @IsOptional()
  @IsNumber()
  pricingId?: number;

  @ApiPropertyOptional({ description: 'Discount rule ID', example: 3 })
  @IsOptional()
  @IsNumber()
  discountId?: number;
}
