import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const dbHost = configService.getOrThrow<string>('DB_HOST');
        const dbPort = configService.getOrThrow<number>('DB_PORT');
        const dbName = configService.getOrThrow<string>('DB_NAME');
        
        console.log(`Connecting to database: ${dbHost}:${dbPort}/${dbName} (SSL: ${isProduction})`);
        
        return {
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: configService.getOrThrow<string>('DB_USERNAME'),
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          database: dbName,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get<boolean>('DB_SYNC', !isProduction),
          logging: configService.get<boolean>('DB_LOGGING', false),
          migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
          extra: {
            connectionTimeoutMillis: 10000,
            query_timeout: 10000,
          },
          // Supabase requires SSL in production
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
