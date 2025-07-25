import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DiscountType, ApplicableTo } from '../dto/create-discount.dto';
import { Booking } from 'src/bookings/entities/booking.entity';

@Entity()
export class Discount {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  code: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  discount_type: DiscountType;

  @Column('int')
  discount_value: number;

  @Column({ type: 'timestamp' })
  expiry_date: Date;

  @Column('int')
  maximum_uses: number;

  @Column('int', { default: 0 })
  current_uses: number;

  @Column({
    type: 'enum',
    enum: ApplicableTo,
  })
  applicableTo: ApplicableTo;

  @OneToMany(() => Booking, (booking) => booking.discount)
  bookings: Booking[];
}
