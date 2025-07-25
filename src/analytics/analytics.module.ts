import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Review } from 'src/review/entities/review.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Driver,
      Booking,
      Vehicle,
      Review,
      PaymentMethod,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
