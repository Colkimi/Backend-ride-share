import { Injectable } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';

const url = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
@Injectable()
export class PaypalService {
  private environment:
    | paypal.core.LiveEnvironment
    | paypal.core.SandboxEnvironment;
  private client: paypal.core.PayPalHttpClient;

  constructor() {
    this.environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET,
    );
    this.client = new paypal.core.PayPalHttpClient(this.environment);
  }

  async createOrder(amount: string, currency = 'USD', returnUrl?: string, cancelUrl?: string) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    
    const applicationContext = {
      brand_name: 'RideShare',
      landing_page: 'BILLING',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: returnUrl || 'http://localhost:3000/success',
      cancel_url: cancelUrl || 'http://localhost:3000/cancel',
    };

    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      application_context: applicationContext,
    });

    const response = await this.client.execute(request);
    return response.result;
  }

  async extractPayPalDetails(orderId: string, orderData: any) {
    const details = {
      orderId: orderId,
      status: orderData.status,
      intent: orderData.intent,
      purchaseUnits: orderData.purchase_units?.map(unit => ({
        referenceId: unit.reference_id,
        amount: unit.amount,
        payee: unit.payee,
      })) || [],
      links: orderData.links?.map(link => ({
        rel: link.rel,
        href: link.href,
        method: link.method,
      })) || [],
      createTime: orderData.create_time,
      updateTime: orderData.update_time,
    };
    return JSON.stringify(details);
  }

  async extractCaptureDetails(captureData: any) {
    const details = {
      id: captureData.id,
      status: captureData.status,
      intent: captureData.intent,
      payer: captureData.payer ? {
        email_address: captureData.payer.email_address,
        payer_id: captureData.payer.payer_id,
        address: captureData.payer.address,
      } : null,
      purchaseUnits: captureData.purchase_units?.map(unit => ({
        referenceId: unit.reference_id,
        payments: unit.payments?.captures?.map(capture => ({
          id: capture.id,
          status: capture.status,
          amount: capture.amount,
          final_capture: capture.final_capture,
          create_time: capture.create_time,
          update_time: capture.update_time,
        })) || [],
      })) || [],
      links: captureData.links?.map(link => ({
        rel: link.rel,
        href: link.href,
        method: link.method,
      })) || [],
    };
    return JSON.stringify(details);
  }

  async captureOrder(orderId: string) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const response = await this.client.execute(request);
    return response.result;
  }

  async fetchToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PayPal token: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
}
