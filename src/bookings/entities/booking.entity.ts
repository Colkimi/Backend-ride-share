import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
import { Discount } from 'src/discount/entities/discount.entity';
import { Pricing } from 'src/pricing/entities/pricing.entity';

export enum Status {
  Requested = 'requested',
  PaymentCompleted = 'payment_completed',
  Accepted = 'accepted',
  In_progress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  RejectedByDriver = 'rejected_by_driver',
}

@Entity()
export class Booking {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column('float')
  start_latitude: number;

  @Column('float')
  start_longitude: number;

  @Column('float')
  end_latitude: number;

  @Column('float')
  end_longitude: number;

  @Column({ type: 'timestamp' })
  pickup_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  dropoff_time?: Date;

  @Column({ nullable: true, default: Status.Requested })
  status?: Status;

  @Column('float', { nullable: true })
  fare?: number;

  @Column('float', { nullable: true })
  distance?: number;

  @Column('float', { nullable: true })
  duration?: number;

  @ManyToOne(() => Discount, (discount) => discount.bookings, {
    nullable: true,
  })
  @JoinColumn({ name: 'discount_id' })
  discount?: Discount;

  @ManyToOne(() => User, (user) => user.bookings, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Pricing, (pricing) => pricing.bookings, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'pricing_id' })
  pricing?: Pricing;

  @ManyToOne(() => Driver, (driver) => driver.bookings, { eager: true })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.bookings, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @ManyToOne(() => PaymentMethod, (paymentMethod) => paymentMethod.bookings, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod?: PaymentMethod;

  @OneToOne(() => Review, (review) => review.booking, { nullable: true })
  review?: Review;
}
