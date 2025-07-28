import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

export enum RideshareStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum ShareType {
  PICKUP_SHARE = 'pickup_share', // Share same pickup location
  ROUTE_SHARE = 'route_share',   // Share similar route
  DESTINATION_SHARE = 'destination_share' // Share same destination
}

@Entity('rideshares')
export class Rideshare {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking, { eager: true })
  @JoinColumn({ name: 'primary_booking_id' })
  primaryBooking: Booking;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'sharer_user_id' })
  sharerUser: User; // User who wants to share the ride

  @Column({ type: 'enum', enum: ShareType })
  shareType: ShareType;

  @Column({ type: 'enum', enum: RideshareStatus, default: RideshareStatus.PENDING })
  status: RideshareStatus;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  sharer_pickup_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  sharer_pickup_longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  sharer_dropoff_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  sharer_dropoff_longitude: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  shared_fare: number; // How much the sharer will pay

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  distance_deviation: number; // Additional distance due to sharing

  @Column({ type: 'int', nullable: true })
  time_deviation: number; // Additional time in seconds

  @Column({ type: 'text', nullable: true })
  sharer_notes: string;

  @Column({ type: 'text', nullable: true })
  primary_user_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickup_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  dropoff_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}