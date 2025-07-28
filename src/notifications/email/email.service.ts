import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Booking } from 'src/bookings/entities/booking.entity';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: '	jamison.schmitt@ethereal.email',
      pass: 'U1HHHp7V4SnMxbvFUk'
    },
  });

  private readonly logger = new Logger(EmailService.name);

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.transporter.sendMail({
        from: `"Rideasy rideshare System" <bruce41@ethereal.email>`,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw error;
    }
  }

  async sendBookingNotification(
    email: string,
    booking: Booking,
  ) {
    const subject = 'Booking Requested';
    const text = `Your booking (ID: ${booking.id}) has been requested successfully.`;
    const html = `
      <div>
        <h2>Booking Submitted</h2>
        <p>Your booking has been received:</p>
        <ul>
          <li>booking ID: ${booking.id}</li>
          <li>Pickup time: ${booking.pickup_time}</li>
          <li>Distance to destination: ${booking.distance} km</li>
          <li>Expected duration of the ride: ${booking.duration}</li>
          <li>Fare for the: $ ${booking.fare}</li>
        </ul>
        <p>You will be notified when the status of your booking changes.</p>
      </div>
    `;

    await this.sendMail(email, subject, text, html);
  }
}
