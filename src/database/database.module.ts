import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        let dbHost = configService.getOrThrow<string>('DB_HOST');
        
        // Force IPv4 resolution to avoid ENETUNREACH with IPv6
        try {
          // If hostname is not already an IP, resolve to IPv4
          if (!/^\d+\.\d+\.\d+\.\d+$/.test(dbHost)) {
            const addresses = await resolve4(dbHost);
            if (addresses && addresses.length > 0) {
              dbHost = addresses[0];
              console.log(`Resolved ${configService.get('DB_HOST')} to IPv4: ${dbHost}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to resolve ${dbHost} to IPv4, using as-is:`, error.message);
        }

        return {
          type: 'postgres',
          host: dbHost,
          port: configService.getOrThrow<number>('DB_PORT'),
          username: configService.getOrThrow<string>('DB_USERNAME'),
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          database: configService.getOrThrow<string>('DB_NAME'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get<boolean>('DB_SYNC', !isProduction),
          logging: configService.get<boolean>('DB_LOGGING', false),
          migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
          extra: {
            connectionTimeoutMillis: 10000,
            query_timeout: 10000,
          },
          // Enable SSL for production by default
          ssl: configService.get<boolean>('DB_SSL', isProduction) ? {
            rejectUnauthorized: false,
          } : false,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
