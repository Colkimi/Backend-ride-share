import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Booking } from 'src/bookings/entities/booking.entity';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  review_id?: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp?: Date;

  @OneToOne(() => Booking, (booking) => booking.review, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @ManyToOne(() => User, (user) => user.reviewsWritten, { eager: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @ManyToOne(() => User, (user) => user.reviewsReceived, { eager: true })
  @JoinColumn({ name: 'reviewee_id' })
  reviewee: User;
}
