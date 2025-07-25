import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Booking } from './entities/booking.entity';
import { PricingModule } from 'src/pricing/pricing.module';
import { Pricing } from 'src/pricing/entities/pricing.entity';
import { Discount } from 'src/discount/entities/discount.entity';
import { DiscountModule } from 'src/discount/discount.module';
import { UsersModule } from 'src/users/users.module';
import { DriverModule } from 'src/driver/driver.module';
import { Driver } from 'src/driver/entities/driver.entity';
import { VehicleModule } from 'src/vehicle/vehicle.module';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { PaymentMethodModule } from 'src/payment-method/payment-method.module';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { ReviewModule } from 'src/review/review.module';
import { Review } from 'src/review/entities/review.entity';
import { OrsMapService } from 'src/External-apis/ors-maps';
import { EmailModule } from 'src/notifications/email/email.module';
import { SmsModule } from 'src/notifications/sms/sms.module';
import { HttpModule } from '@nestjs/axios';
import { LocationModule } from 'src/location/location.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: 30,
      }),
    }),
    DatabaseModule,
    forwardRef(() => PricingModule),
    forwardRef(() => DiscountModule),
    forwardRef(() => UsersModule),
    forwardRef(() => DriverModule),
    forwardRef(() => VehicleModule),
    forwardRef(() => PaymentMethodModule),
    forwardRef(() => ReviewModule),
    TypeOrmModule.forFeature([
      Booking,
      User,
      Pricing,
      Discount,
      Driver,
      Vehicle,
      PaymentMethod,
      Review,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => EmailModule),
    forwardRef(() => SmsModule),
    forwardRef(() => HttpModule),
    forwardRef(() => LocationModule)
  ],

  controllers: [BookingsController],
  providers: [BookingsService, OrsMapService],
})
export class BookingsModule {}
