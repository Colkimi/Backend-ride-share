import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CapturePaypalDto {
  @ApiProperty({
    description: 'The PayPal order ID to capture',
    example: '5O190130TN364715T',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
