import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { methodPay, PaymentMethod } from './entities/payment-method.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { MpesaService } from '../External-apis/mpesa.service';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { PaypalService } from '../External-apis/paypal.service';

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentRepository: Repository<PaymentMethod>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly paypalService: PaypalService,
  ) {}

  async create(createPaymentMethodDto: CreatePaymentMethodDto) {
    const { userId, returnUrl, cancelUrl, ...paymentData } = createPaymentMethodDto;
    
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    let approvalUrl: string | null = null;
    let details: string | null = null;

    // If payment type is PAYPAL, create a PayPal order
    if (paymentData.payment_type === methodPay.PAYPAL) {
      try {
        const order = await this.paypalService.createOrder(
          paymentData.amount.toString(),
          paymentData.currency || 'USD',
          returnUrl || 'http://localhost:3000/success',
          cancelUrl || 'http://localhost:3000/cancel'
        );

        // Extract the approval URL from the PayPal order response
        const approvalLink = order.links?.find(link => link.rel === 'approve')?.href;
        approvalUrl = approvalLink || null;

        // Store only the order ID in details
        details = order.id;
      } catch (error) {
        console.error('Error creating PayPal order:', error);
        throw new BadRequestException('Failed to create PayPal order');
      }
    }

    const paymentMethod = this.paymentRepository.create({
      ...paymentData,
      approvalUrl: approvalUrl || undefined,
      details: details || undefined,
      user,
    });
    
    return this.paymentRepository.save(paymentMethod);
  }

  async findAll() {
    const cached = await this.cacheManager.get<PaymentMethod[]>(
      'all_payment_methods',
    );
    if (cached) {
      return cached;
    }
    const paymentMethods = await this.paymentRepository.find();
    await this.cacheManager.set('all_payment_methods', paymentMethods);
    return paymentMethods;
  }

  async findOne(id: number) {
    const cacheKey = `payment_method_${id}`;
    const cached = await this.cacheManager.get<PaymentMethod>(cacheKey);
    if (cached) {
      return cached;
    }
    const paymentMethod = await this.paymentRepository.findOne({
      where: { payment_method_id: id },
    });
    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with id ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, paymentMethod);
    return paymentMethod;
  }

  async update(id: number, updatePaymentMethodDto: UpdatePaymentMethodDto) {
    const paymentMethod = await this.paymentRepository.findOne({
      where: { payment_method_id: id },
    });
    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with id ${id} not found`);
    }
    Object.assign(paymentMethod, updatePaymentMethodDto);
    const updatedPaymentMethod =
      await this.paymentRepository.save(paymentMethod);
    await this.cacheManager.del('all_payment_methods');
    await this.cacheManager.del(`payment_method_${id}`);
    return updatedPaymentMethod;
  }

  async remove(id: number): Promise<string> {
    const result = await this.paymentRepository.delete(id);
    if (result.affected === 0) {
      return `Payment method with id ${id} not found`;
    }
    await this.cacheManager.del('all_payment_methods');
    await this.cacheManager.del(`payment_method_${id}`);
    return `Payment method with id ${id} deleted successfully`;
  }

  async capturePayPalPayment(paymentMethodId: number, orderId: string) {
    const paymentMethod = await this.paymentRepository.findOne({
      where: { payment_method_id: paymentMethodId },
    });
    
    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with id ${paymentMethodId} not found`);
    }

    if (paymentMethod.payment_type !== methodPay.PAYPAL) {
      throw new BadRequestException('Payment method is not PayPal');
    }

    try {
      const captureResult = await this.paypalService.captureOrder(orderId);
      
      // Extract and store capture details
      const captureDetails = await this.paypalService.extractCaptureDetails(captureResult);
      
      // Update the payment method with capture details
      paymentMethod.details = captureDetails;
      const updatedPaymentMethod = await this.paymentRepository.save(paymentMethod);
      
      // Clear cache
      await this.cacheManager.del('all_payment_methods');
      await this.cacheManager.del(`payment_method_${paymentMethodId}`);
      
      return {
        paymentMethod: updatedPaymentMethod,
        captureResult: captureResult
      };
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      throw new BadRequestException('Failed to capture PayPal payment');
    }
  }


}
