import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { methodPay } from '../entities/payment-method.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @IsNumber()
  @IsOptional()
  payment_method_id?: number;

  @IsEnum(methodPay, {
    message:
      'Payment method must be one of the following: mpesa,paypal,master_card,visa_card',
  })
  @ApiProperty({
    description: 'Payment method',
    example: 'paypal',
  })
  payment_type?: methodPay = methodPay.PAYPAL;

  @ApiProperty({
    description: 'Payment amount',
    example: 150,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'payment currency',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  details?: string;

  @ApiProperty({
    description: 'User ID associated with this payment method',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'payment defaultness',
    example: true,
    default: true,
  })
  @IsBoolean()
  is_default: boolean;

  @ApiProperty({
    description: 'Return URL for PayPal approval flow',
    example: 'http://localhost:3000/success',
    required: false,
  })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({
    description: 'Cancel URL for PayPal approval flow',
    example: 'http://localhost:3000/cancel',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
