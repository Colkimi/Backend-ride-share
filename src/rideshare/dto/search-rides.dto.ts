import { IsNumber, IsDateString, IsOptional } from 'class-validator';

export class SearchRidesDto {
  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsNumber()
  dropoffLat: number;

  @IsNumber()
  dropoffLng: number;

  @IsDateString()
  pickupTime: string;

  @IsOptional()
  @IsNumber()
  maxPickupDistance?: number = 5; // km - Increased from 2km to allow more matches

  @IsOptional()
  @IsNumber()
  maxRouteDeviation?: number = 10; // km - Increased from 5km to allow more flexible routing

  @IsOptional()
  @IsNumber()
  timeWindow?: number = 60; // minutes - Increased from 30min to allow more time flexibility
}