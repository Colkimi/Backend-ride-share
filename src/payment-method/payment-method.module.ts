import { Module, forwardRef } from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { PaymentMethodController } from './payment-method.controller';
import { PaypalService } from 'src/External-apis/paypal.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { BookingsModule } from 'src/bookings/bookings.module';
import { Booking } from 'src/bookings/entities/booking.entity';

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
    forwardRef(() => UsersModule),
    forwardRef(() => BookingsModule),
    TypeOrmModule.forFeature([PaymentMethod, User, Booking,]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PaymentMethodController],
  providers: [PaymentMethodService, PaypalService],
  exports: [PaymentMethodService],
})
export class PaymentMethodModule {}
