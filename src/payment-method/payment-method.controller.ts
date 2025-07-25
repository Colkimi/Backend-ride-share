import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaypalService } from 'src/External-apis/paypal.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CapturePaypalDto } from './dto/capture-paypal.dto';

@ApiTags('payment method')
@Controller('payment-method')
export class PaymentMethodController {
  constructor(
    private readonly paymentMethodService: PaymentMethodService,
    private readonly paypalService: PaypalService,
  ) {}

  @Post()
  async create(@Body() createPaymentMethodDto: CreatePaymentMethodDto) {
    return this.paymentMethodService.create(createPaymentMethodDto);
  }

  @Get()
  findAll() {
    return this.paymentMethodService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodService.update(id, updatePaymentMethodDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.paymentMethodService.remove(id);
  }

  @Post(':id/capture-paypal')
  @ApiOperation({ summary: 'Capture PayPal payment and update details' })
  @ApiResponse({ status: 200, description: 'PayPal payment captured successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 400, description: 'Invalid payment method or capture failed' })
  async capturePayPalPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() capturePaypalMethodDto: CapturePaypalDto
  ) {
    return this.paymentMethodService.capturePayPalPayment(
      id,
      capturePaypalMethodDto.orderId
    );
  }
}
