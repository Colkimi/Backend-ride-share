import { IsEnum, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ShareType } from '../entities/rideshare.entity';

export class CreateRideshareDto {
  @IsNumber()
  primaryBookingId: number;

  @IsEnum(ShareType)
  shareType: ShareType;

  @IsNumber()
  sharer_pickup_latitude: number;

  @IsNumber()
  sharer_pickup_longitude: number;

  @IsNumber()
  sharer_dropoff_latitude: number;

  @IsNumber()
  sharer_dropoff_longitude: number;

  @IsOptional()
  @IsString()
  sharer_notes?: string;

  @IsOptional()
  @IsDateString()
  pickup_time?: Date;
}
