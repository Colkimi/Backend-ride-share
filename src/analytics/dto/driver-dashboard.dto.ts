import { ApiProperty } from '@nestjs/swagger';

export class DriverDashboardDto {
  @ApiProperty({ example: 1 })
  driverId: number;

  @ApiProperty({
    example: {
      plateNumber: 'KCA 123A',
      model: 'Toyota Corolla',
      type: 'Sedan',
    }
  })
  vehicle: {
    plateNumber: string;
    model: string;
    type: string;
  } | null;

  @ApiProperty({ type: [Object] })
  monthlyAnalytics: Array<{
    day: string;
    completedRides: number;
    earnings: number;
    previousWeekRides: number;
  }>;

  @ApiProperty({
    example: {
      customerExperience: 85,
      timeConsciousness: 85,
      friendliness: 92,
      overallRating: 4.5,
      totalRatings: 127,
    }
  })
  performanceMetrics: {
    customerExperience: number;
    timeConsciousness: number;
    friendliness: number;
    overallRating: number;
    totalRatings: number;
  };

  @ApiProperty({ type: [Object] })
  topDestinations: Array<{
    destination: string;
    price: number;
    count: number;
    image: string;
  }>;

  @ApiProperty({
    example: {
      totalDrives: 45,
      previousWeek: 38,
      percentageChange: 18.42,
      totalEarnings: 12500.75,
    }
  })
  weeklyStats: {
    totalDrives: number;
    previousWeek: number;
    percentageChange: number;
    totalEarnings: number;
  };

  @ApiProperty({
    example: {
      isAvailable: true,
      lastActive: '2024-01-15T10:30:00.000Z',
    }
  })
  availability: {
    isAvailable: boolean;
    lastActive: Date;
  };
}
