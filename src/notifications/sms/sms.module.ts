import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { BookingsModule } from 'src/bookings/bookings.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    TypeOrmModule.forFeature([User, Booking]),
    forwardRef(() => BookingsModule),
],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
