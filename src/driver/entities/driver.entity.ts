import { Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Location } from 'src/location/entities/location.entity';
import { User } from 'src/users/entities/user.entity';

export enum Status {
  Verified = 'verified',
  Unverified = 'unverified',
  Rejected = 'rejected',
}

@Entity()
export class Driver {
  @PrimaryGeneratedColumn()
  driver_id?: number;

  @Column()
  userId: number;

  @Column()
  license_number: number;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  rating: number;

  @Column()
  verification_status: Status = Status.Unverified;

  @Column()
  total_trips: number;

  @Column()
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @OneToMany(() => Booking, (booking) => booking.driver)
  bookings: Booking[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles: Vehicle[];

  @OneToOne(() => Location, (location) => location.driver, { nullable: true })
  location?: Location;

  @OneToOne(() => User, (user) => user.driver, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
