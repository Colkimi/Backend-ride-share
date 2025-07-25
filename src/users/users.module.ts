import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/guards';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { LocationModule } from 'src/location/location.module';
import { PaymentMethodModule } from 'src/payment-method/payment-method.module';
import { ReviewModule } from 'src/review/review.module';
import { BookingsModule } from 'src/bookings/bookings.module';
import { Location } from 'src/location/entities/location.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
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
        ttl: 30, // seconds
      }),
    }),
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => LocationModule),
    forwardRef(() => PaymentMethodModule),
    forwardRef(() => ReviewModule),
    forwardRef(() => BookingsModule),
    TypeOrmModule.forFeature([User, Location, PaymentMethod, Review, Booking]),
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
