import { ApiProperty } from '@nestjs/swagger';

export class DriverAnalyticsDto {
  @ApiProperty({ example: 350 })
  totalDrivers: number;

  @ApiProperty({ example: 280 })
  activeDrivers: number;

  @ApiProperty({ example: 4.5 })
  averageRating: number;

  @ApiProperty({ type: [Object] })
  topPerformers: Array<{
    id: number;
    rating: number;
    totalBookings: number;
  }>;
}

export class DriverAnalyticsQueryDto {
  @ApiProperty({ required: false, example: '2024-01-01' })
  startDate?: string;

  @ApiProperty({ required: false, example: '2024-01-31' })
  endDate?: string;
}
