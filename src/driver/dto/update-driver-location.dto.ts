import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDriverLocationDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 36.8219,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()

  latitude: number;
  @ApiProperty({
    description: 'Longitude coordinate',
    example: -1.2921,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  longitude: number;
}
