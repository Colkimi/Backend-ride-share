import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  @Get('success')
  @ApiOperation({ summary: 'PayPal payment success callback' })
  @ApiQuery({ name: 'token', required: false, description: 'PayPal order token' })
  @ApiQuery({ name: 'PayerID', required: false, description: 'PayPal payer ID' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async paymentSuccess(
    @Query('token') token?: string,
    @Query('PayerID') payerId?: string,
    @Res() res?: Response,
  ) {
    if (res) {
      // Redirect to frontend success page
      return res.redirect(`${ 'http://localhost:3000'}/success?token=${token}&PayerID=${payerId}`);
    }
    
    return {
      status: 'success',
      message: 'Payment completed successfully',
      token,
      payerId,
    };
  }

  @Get('cancel')
  @ApiOperation({ summary: 'PayPal payment cancel callback' })
  @ApiQuery({ name: 'token', required: false, description: 'PayPal order token' })
  @ApiResponse({ status: 200, description: 'Payment was cancelled' })
  async paymentCancel(
    @Query('token') token?: string,
    @Res() res?: Response,
  ) {
    if (res) {
      // Redirect to frontend cancel page
      return res.redirect(`${ 'http://localhost:3000'}/failed?token=${token}`);
    }
    
    return {
      status: 'cancelled',
      message: 'Payment was cancelled by user',
      token,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check payment status' })
  @ApiQuery({ name: 'orderId', required: true, description: 'PayPal order ID' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getPaymentStatus(@Query('orderId') orderId: string) {
    return {
      orderId,
      status: 'pending', 
      message: 'Payment status retrieved',
    };
  }
}
