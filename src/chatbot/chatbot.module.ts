import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Booking } from 'src/bookings/entities/booking.entity';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { RoleSwitchingController } from 'src/users/role-switching.controller';
import { RoleSwitchingService } from 'src/users/role-switching.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      User,
      Driver,
      PaymentMethod,
      Review,
    ]),
    AnalyticsModule, 
  ],
  controllers: [ChatbotController, RoleSwitchingController],
  providers: [ChatbotService, RoleSwitchingService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
