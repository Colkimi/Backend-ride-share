import { forwardRef, Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { OrsMapService } from 'src/External-apis/ors-maps';
import { LocationGateway } from './location.gateway';
import { DriverModule } from 'src/driver/driver.module';
import { Driver } from 'src/driver/entities/driver.entity';
import { HttpModule } from '@nestjs/axios';

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
    AuthModule,
    HttpModule,
    forwardRef(() => DriverModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([Location, User, Driver]),
  ],
  controllers: [LocationController],
  providers: [LocationService, OrsMapService, LocationGateway],
  exports: [LocationService],
})
export class LocationModule {}
