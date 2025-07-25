import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from 'src/bookings/entities/booking.entity';

export class DriverBookingActionDto {
  @ApiProperty({ description: 'The booking ID' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ description: 'The action to perform', enum: ['accept', 'reject'] })
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';
}

export class DriverBookingResponseDto {
  @ApiProperty({ description: 'The booking ID' })
  bookingId: number;

  @ApiProperty({ description: 'The new status of the booking' })
  status: Status;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
