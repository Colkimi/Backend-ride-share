import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Driver } from 'src/driver/entities/driver.entity';
import { Booking } from 'src/bookings/entities/booking.entity';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn('increment')
  vehicle_id?: number;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: string;

  @Column()
  license_plate: string;

  @Column()
  color: string;

  @Column()
  capacity: string;

  @Column()
  type: string;

  @Column()
  approved?: boolean;

  @ManyToOne(() => Driver, (driver) => driver.vehicles, { eager: true })
  driver: Driver;

  @OneToMany(() => Booking, (booking) => booking.vehicle)
  bookings: Booking[];
}
