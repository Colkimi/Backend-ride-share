import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

export interface SmsOptions {
  to: string;
  body: string;
  from?: string;
}

export interface SmsTemplate {
  bookingConfirmation: (customerName: string) => string;
  bookingAccepted: (customerName: string, driverName: string, pickupAddress: string, destinationAddress: string) => string;
  driverArrived: (customerName: string, driverName: string, vehicle: string) => string;
  rideCompleted: (customerName: string, amount: string) => string;
  driverAlert: (driverName: string, pickup: string, customerName: string) => string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Twilio configuration is missing. Please check your environment variables.');
    }

    this.client = Twilio(accountSid, authToken);
    this.fromNumber = phoneNumber;
  }

  async sendSms(options: SmsOptions): Promise<any> {
    try {
      const message = await this.client.messages.create({
        body: options.body,
        from: options.from || this.fromNumber,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully to ${options.to}. Message SID: ${message.sid}`);
      return message;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}: ${error.message}`);
      throw error;
    }
  }

  async sendBookingConfirmation(to: string, customerName: string, driverName: string, pickupAddress: string, destinationAddress: string): Promise<any> {
    const message = this.templates.bookingAccepted(customerName, driverName, pickupAddress, destinationAddress);
    return this.sendSms({ to, body: message });
  }

  async sendRequestToPay(to:string, customerName: string): Promise<any> {
    const message = this.templates.bookingConfirmation(customerName);
    return this.sendSms({ to, body: message });
  }

  async sendDriverArrived(to: string, customerName: string, driverName: string, vehicle: string): Promise<any> {
    const message = this.templates.driverArrived(customerName, driverName, vehicle);
    return this.sendSms({ to, body: message });
  }

  async sendRideCompleted(to: string, customerName: string, amount: string): Promise<any> {
    const message = this.templates.rideCompleted(customerName, amount);
    return this.sendSms({ to, body: message });
  }

  async sendDriverAlert(to: string, driverName: string, pickup: string, customerName: string): Promise<any> {
    const message = this.templates.driverAlert(driverName, pickup, customerName);
    return this.sendSms({ to, body: message });
  }

  private templates: SmsTemplate = {
    bookingConfirmation: (customerName: string) => 
      `Hi ${customerName}! Your ride booking is almost complete. Please complete your payment to confirm the ride. Track your ride in the app.`,

    bookingAccepted: (customerName:string, driverName: string, pickup: string, destination: string) =>
      `Hi ${customerName}! Your booking has been accepted. Driver ${driverName} will pick you up from ${pickup} to ${destination}. Track your ride in the app.`,
    
    driverArrived: (customerName: string, driverName: string, vehicle: string) => 
      `Hi ${customerName}! Your driver ${driverName} has arrived in ${vehicle}. Please meet them at the pickup location.`,
    
    rideCompleted: (customerName: string, amount: string) => 
      `Hi ${customerName}! Your ride is complete. Total fare: ${amount}. Thank you for choosing our service!`,
    
    driverAlert: (driverName: string, pickup: string, customerName: string) => 
      `Hi ${driverName}! New ride request from ${customerName}. Pickup location: ${pickup}. Accept in the app.`
  };
}
