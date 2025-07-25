import { ApiProperty } from '@nestjs/swagger';

export class SystemStatusDto {
  @ApiProperty({ example: 45 })
  activeBookings: number;

  @ApiProperty({ example: 120 })
  availableDrivers: number;

  @ApiProperty({ example: 'healthy' })
  systemHealth: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  lastUpdate: string;
}
