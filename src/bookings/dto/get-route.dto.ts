import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class GetRouteDto {
  @ApiProperty({ example: '49.41461', description: 'Start latitude' })
  @IsNotEmpty()
  @IsNumberString()
  startLat: string;

  @ApiProperty({ example: '8.681495', description: 'Start longitude' })
  @IsNotEmpty()
  @IsNumberString()
  startLng: string;

  @ApiProperty({ example: '49.420318', description: 'End latitude' })
  @IsNotEmpty()
  @IsNumberString()
  endLat: string;

  @ApiProperty({ example: '8.687872', description: 'End longitude' })
  @IsNotEmpty()
  @IsNumberString()
  endLng: string;
}
