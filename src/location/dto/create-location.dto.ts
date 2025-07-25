import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Label } from '../entities/location.entity';

export class CreateLocationDto {
  @ApiPropertyOptional({
    description: 'Location ID (auto-generated)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  location_id?: number;

  @ApiProperty({
    description: 'Label for the location',
    enum: Label,
    example: 'home',
  })
  @IsString()
  @IsEnum(Label, {
    message: 'Label must be one of the following: home,work,custom',
  })
  label: Label;

  @ApiProperty({
    description: 'Address of the location',
    example: '123 Main St, City, Country',
  })
  @IsString()
  address: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ description: 'Is this the default location?', example: false })
  @IsBoolean()
  is_default: boolean;
}
