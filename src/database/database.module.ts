import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Resolver } from 'dns/promises';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        let dbHost = configService.getOrThrow<string>('DB_HOST');
        const dbPort = configService.getOrThrow<number>('DB_PORT');
        const dbName = configService.getOrThrow<string>('DB_NAME');
        
        // Try to resolve hostname to IPv4 using custom DNS servers
        if (!/^\d+\.\d+\.\d+\.\d+$/.test(dbHost)) {
          try {
            const resolver = new Resolver();
            resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
            
            console.log(`Attempting to resolve ${dbHost} using custom DNS servers...`);
            const addresses = await resolver.resolve4(dbHost);
            
            if (addresses && addresses.length > 0) {
              const resolvedIp = addresses[0];
              console.log(`✓ Resolved ${dbHost} to ${resolvedIp}`);
              dbHost = resolvedIp;
            }
          } catch (error) {
            console.warn(`⚠ Failed to resolve ${dbHost}, using hostname as-is:`, error.message);
            console.log('This may indicate network restrictions in your deployment environment.');
            console.log('Consider using Supabase connection pooler or check platform DNS settings.');
          }
        }
        
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
