import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Booking } from 'src/bookings/entities/booking.entity';
import { User } from 'src/users/entities/user.entity';

export enum methodPay {
  PAYPAL = 'paypal',
  VISA_CARD = 'visa_card',
  MASTER_CARD = 'master_card',
  MPESA = 'mpesa',
}

@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  payment_method_id: number;

  @Column({
    type: 'enum',
    enum: methodPay,
  })
  payment_type: methodPay;

  @Column()
  amount: number;

  @Column({nullable: true})
  currency?: string;

  @Column({ nullable: true })
  details?: string;

  @Column({ nullable: true })
  approvalUrl?: string;

  @Column({ default: false })
  is_default: boolean;

  @ManyToOne(() => User, (user) => user.paymentMethods, { eager: true })
  user: User;

  @OneToMany(() => Booking, (booking) => booking.paymentMethod)
  bookings: Booking[];
}
