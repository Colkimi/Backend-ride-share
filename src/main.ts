import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './http-exception.filter';
import helmet from 'helmet';
import 'reflect-metadata';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.enableCors();

  const configService = app.get(ConfigService);
  const PORT = configService.getOrThrow<number>('PORT');
  const config = new DocumentBuilder()
    .setTitle('Ride Sharing system')
    .setDescription(
      `
     A Ride Sharing System API
       `,
    )
    .setVersion('1.0')
    .addTag('auth', 'use authentication endpoint')
    .addTag('analytics', 'use analytics endpoint')
    .addTag('user', 'use users endpoint')
    .addTag('bookings', 'use bookings endpoint')
    .addTag('chatbot', 'use chatbot endpoint')
    .addTag('driver', 'use driver endpoint')
    .addTag('payment', 'use payment endpoint')
    .addTag('payment method', 'use payment method endpoint')
    .addTag('vehicle', 'use vehicle endpoint')
    .addTag('review', 'use review endpoint')
    .addTag('location', 'use locations endpoint')
    .addTag('pricing', 'use pricing endpoint')
    .addTag('discount', 'use discounts endpoint')
    .addTag('seeding', 'use seeding endpoint')
    .addBearerAuth()
    .addServer(`http://localhost:${PORT}`)
    .addServer('https://deployedapp.com')
    .setVersion('1.0')
    .setTermsOfService('https://rideshare.com/terms')
    .setContact(
      'API Support',
      'https://ourcompany.com/support',
      'api-support@ourcomany.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();
  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    document.security = [{ bearer: [] }];
    return document;
  };

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: '/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: false,
    },
    customCss: `
  .swagger-ui .topbar { display:none }
  .swaggger-ui .info  { margin-bottom:25px }
  `,
    customSiteTitle: 'Ride Sharing Api',
    customfavIcon:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEthKcF9mPcr0VjEH0ILoQS_JywzjNrlrEIA&s',
  });
  await app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
  });
}
bootstrap();
