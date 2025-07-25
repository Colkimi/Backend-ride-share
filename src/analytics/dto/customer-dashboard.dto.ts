import { ApiProperty } from '@nestjs/swagger';

export class CustomerDashboardDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 25 })
  totalBookings: number;

  @ApiProperty({ example: 1250.50 })
  totalExpenditure: number;

  @ApiProperty({ 
    example: { 
      '2024-01': 5, 
      '2024-02': 8, 
      '2024-03': 12 
    } 
  })
  monthlyStats: Record<string, number>;

  @ApiProperty({ 
    example: { 
      '<10 mins': 10, 
      '10-30 mins': 12, 
      '>30 mins': 3 
    } 
  })
  rideTimeDistribution: Record<string, number>;

  @ApiProperty({ type: [Object] })
  recentBookings: any[];

  @ApiProperty({ 
    example: { 
      currentWeek: 5, 
      previousWeek: 3, 
      percentageChange: 66.67 
    } 
  })
  weeklyTrends: {
    currentWeek: number;
    previousWeek: number;
    percentageChange: number;
  };

  @ApiProperty({ type: [Object] })
  expenditureTrends: Array<{
    day: string;
    amount: number;
  }>;
}
