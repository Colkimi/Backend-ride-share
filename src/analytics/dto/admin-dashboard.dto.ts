import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty({
    example: {
      totalUsers: 1250,
      totalDrivers: 350,
      totalBookings: 5280,
      totalRevenue: 125000.75,
      activeBookings: 45,
    }
  })
  systemOverview: {
    totalUsers: number;
    totalDrivers: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
  };

  @ApiProperty({ type: [Object] })
  monthlyAnalytics: Array<{
    day: string;
    income: number;
    expenditure: number;
    profit: number;
    bookingCount: number;
  }>;

  @ApiProperty({ type: [Object] })
  incomeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({
    example: {
      morning: { count: 45, percentage: 35.5 },
      afternoon: { count: 60, percentage: 47.2 },
      evening: { count: 22, percentage: 17.3 },
    }
  })
  rideTimeAnalytics: {
    morning: { count: number; percentage: number };
    afternoon: { count: number; percentage: number };
    evening: { count: number; percentage: number };
  };

  @ApiProperty({
    example: {
      driverVerifications: 12,
      systemMaintenance: 1,
      newDiscounts: 3,
      governmentDeals: 2,
    }
  })
  pendingActions: {
    driverVerifications: number;
    systemMaintenance: number;
    newDiscounts: number;
    governmentDeals: number;
  };

  @ApiProperty({ example: 8750.25 })
  weeklyRevenue: number;

  @ApiProperty({ example: 15.5 })
  revenueTrend: number;
}
