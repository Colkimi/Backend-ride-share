import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { LogsModule } from './logs/logs.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { CacheableMemory } from 'cacheable';
import { createKeyv, Keyv } from '@keyv/redis';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AtGuard } from './auth/guards';
import { LoggerMiddleware } from './logger.middleware';
import { VehicleModule } from './vehicle/vehicle.module';
import { AuthModule } from './auth/auth.module';
import { PaymentMethodModule } from './payment-method/payment-method.module';
import { DriverModule } from './driver/driver.module';
import { LocationModule } from './location/location.module';
import { ReviewModule } from './review/review.module';
import { PricingModule } from './pricing/pricing.module';
import { DiscountModule } from './discount/discount.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { EmailModule } from './notifications/email/email.module';
import { SmsModule } from './notifications/sms/sms.module';
import { SeedingModule } from './seeding/seeding.module';
import { PaymentModule } from './payment/payment.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RideshareModule } from './rideshare/rideshare.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    DriverModule,
    BookingsModule,
    LogsModule,
    DatabaseModule,
    AuthModule,
    ChatbotModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        return {
          ttl: 60000, // 60 sec: time-to-live
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 30000, lruSize: 5000 }),
            }),
            createKeyv(configService.getOrThrow<string>('REDIS_URL')),
          ],
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    VehicleModule,
    PaymentMethodModule,
    LocationModule,
    ReviewModule,
    PricingModule,
    DiscountModule,
    ChatbotModule,
    EmailModule,
    SmsModule,
    SeedingModule,
    PaymentModule,
    AnalyticsModule,
    RideshareModule,
    ],
  controllers: [],
  providers: [
    {
      provide: 'APP_INTERCEPTOR',
      useClass: CacheInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(
        'user',
        'bookings',
        'driver',
        'payment-method',
        'vehicle',
        'location',
        'review',
        'pricing',
        'discount',
        'payment',
        'seeding',
        'analytics',
      );
  }
}
