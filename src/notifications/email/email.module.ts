import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/entities/user.entity';
import { EmailService } from 'src/notifications/email/email.service';
import { Booking } from 'src/bookings/entities/booking.entity';
import { BookingsModule } from 'src/bookings/bookings.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User,Booking]),
    AuthModule,
    forwardRef(() => BookingsModule),
  ],
  controllers: [],
  providers: [EmailService],
  exports: [ EmailService],
})
export class EmailModule {}
