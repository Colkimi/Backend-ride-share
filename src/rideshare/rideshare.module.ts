import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideshareService } from './rideshare.service';
import { RideshareController } from './rideshare.controller';
import { Rideshare } from './entities/rideshare.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { OrsMapService } from '../External-apis/ors-maps';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { BookingsModule } from 'src/bookings/bookings.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: configService.get<number>('CACHE_TTL') || 60, // seconds
      }),
    }),
    BookingsModule,
    UsersModule,
    HttpModule,
    TypeOrmModule.forFeature([Rideshare, Booking, User]),
  ],
  controllers: [RideshareController],
  providers: [RideshareService, OrsMapService],
  exports: [RideshareService],
})
export class RideshareModule {}
