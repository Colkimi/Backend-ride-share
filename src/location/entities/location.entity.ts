import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';

export enum Label {
  HOME = 'home',
  WORK = 'work',
  CUSTOM = 'custom',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  location_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'enum', enum: Label, default: Label.CUSTOM })
  label: Label;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ default: false })
  is_default: boolean;

  @ManyToOne(() => User, (user) => user.locations, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Driver, (driver) => driver.location, { eager: true, nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver?: Driver;

  @Column({ type: 'bigint', nullable: true })
  lastUpdate: number;
}