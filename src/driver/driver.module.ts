import { Module, forwardRef } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { RolesGuard } from 'src/auth/guards';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { BookingsModule } from 'src/bookings/bookings.module';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { VehicleModule } from 'src/vehicle/vehicle.module';
import { VehicleService } from 'src/vehicle/vehicle.service';
import { LocationModule } from 'src/location/location.module';
import { Location } from 'src/location/entities/location.entity';
import { OrsMapService } from 'src/External-apis/ors-maps';
import { HttpModule } from '@nestjs/axios';
import { ReviewModule } from 'src/review/review.module';
import { Review } from 'src/review/entities/review.entity';

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
    HttpModule,
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => BookingsModule),
    forwardRef(() => VehicleModule),
    forwardRef(() => LocationModule),
    forwardRef(() => DriverModule),
    forwardRef(() => ReviewModule),
    TypeOrmModule.forFeature([Driver, User, Booking, Vehicle, Location, Review]),
  ],
  controllers: [DriverController],
  providers: [DriverService, RolesGuard, VehicleService, OrsMapService],
})
export class DriverModule {}
