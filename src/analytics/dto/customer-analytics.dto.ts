import { ApiProperty } from '@nestjs/swagger';

export class CustomerAnalyticsDto {
  @ApiProperty({ example: 1250 })
  totalCustomers: number;

  @ApiProperty({ example: 980 })
  activeCustomers: number;

  @ApiProperty({ example: 15.5 })
  retentionRate: number;

  @ApiProperty({ example: 45 })
  newCustomers: number;

  @ApiProperty({ example: 8.2 })
  churnRate: number;
}

export class CustomerAnalyticsQueryDto {
  @ApiProperty({ required: false, example: '2024-01-01' })
  startDate?: string;

  @ApiProperty({ required: false, example: '2024-01-31' })
  endDate?: string;
}
