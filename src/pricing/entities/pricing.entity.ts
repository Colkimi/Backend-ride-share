import { Booking } from 'src/bookings/entities/booking.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Pricing {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'float' })
  basefare: number;

  @Column({ type: 'float' })
  cost_per_km: number;

  @Column({ type: 'float' })
  cost_per_minute: number;

  @Column({ type: 'float' })
  service_fee: number;

  @Column({ type: 'float' })
  minimum_fare: number;

  @Column({ type: 'float' })
  conditions_multiplier: number;

  @OneToMany(() => Booking, (booking) => booking.pricing)
  bookings: Booking[];
}
