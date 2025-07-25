import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Location } from 'src/location/entities/location.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Driver } from 'src/driver/entities/driver.entity';

export enum Role {
  ADMIN = 'admin',
  DRIVER = 'driver',
  CUSTOMER = 'customer',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('increment')
  userId: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  password: string;

  @Column({ type: 'text', nullable: true })
  hashedRefreshToken: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Location, (location) => location.user)
  locations: Location[];

  @OneToMany(
    () => PaymentMethod,
    (paymentMethod: PaymentMethod) => paymentMethod.user,
  )
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Review, (review) => review.reviewer)
  reviewsWritten: Review[];

  @OneToMany(() => Review, (review) => review.reviewee)
  reviewsReceived: Review[];

  @OneToMany(() => Booking, (booking) => booking.user)
  bookings: Booking[];

  @OneToOne(() => Driver, (driver) => driver.user)
  driver?: Driver;
}
