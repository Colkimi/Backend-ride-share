import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.getOrThrow<boolean>('DB_SYNC', true),
        logging: configService.getOrThrow<boolean>('DB_LOGGING', false),
        migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
        extra: {
          // Force IPv4 to avoid ENETUNREACH errors with IPv6
          connectionTimeoutMillis: 5000,
        },
        // SSL configuration
        ssl: configService.get<boolean>('DB_SSL', false) ? {
          rejectUnauthorized: false,
        } : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
