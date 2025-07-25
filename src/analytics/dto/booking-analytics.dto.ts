import { ApiProperty } from '@nestjs/swagger';

export class BookingAnalyticsDto {
  @ApiProperty({ example: 125 })
  totalBookings: number;

  @ApiProperty({ example: 12500.75 })
  revenue: number;

  @ApiProperty({ example: 100.0 })
  averageFare: number;

  @ApiProperty({ example: 85.5 })
  completionRate: number;

  @ApiProperty({ example: 12.5 })
  cancellationRate: number;

  @ApiProperty({ type: [Object] })
  peakHours: Array<{
    hour: number;
    bookings: number;
  }>;
}

export class BookingAnalyticsQueryDto {
  @ApiProperty({ required: false, example: '2024-01-01' })
  startDate?: string;

  @ApiProperty({ required: false, example: '2024-01-31' })
  endDate?: string;
}
