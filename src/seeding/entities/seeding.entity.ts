import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsJSON, IsOptional } from 'class-validator';

export enum SeedingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export enum SeedingType {
  FULL = 'full',
  USERS = 'users',
  DRIVERS = 'drivers',
  VEHICLES = 'vehicles',
  LOCATIONS = 'locations',
  BOOKINGS = 'bookings',
  REVIEWS = 'reviews',
  PRICING = 'pricing',
  DISCOUNTS = 'discounts',
  PAYMENT_METHODS = 'payment_methods',
}

@Entity('seedings')
export class Seeding {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier for the seeding operation' })
  id: string;

  @Column({ type: 'enum', enum: SeedingType, default: SeedingType.FULL })
  @ApiProperty({ description: 'Type of seeding operation', enum: SeedingType })
  @IsEnum(SeedingType)
  type: SeedingType;

  @Column({ type: 'enum', enum: SeedingStatus, default: SeedingStatus.PENDING })
  @ApiProperty({ description: 'Current status of the seeding operation', enum: SeedingStatus })
  @IsEnum(SeedingStatus)
  status: SeedingStatus;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Description of the seeding operation', required: false })
  @IsOptional()
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Configuration parameters for the seeding operation', required: false })
  @IsJSON()
  @IsOptional()
  config?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Results of the seeding operation', required: false })
  @IsJSON()
  @IsOptional()
  results?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Error message if seeding failed', required: false })
  @IsOptional()
  errorMessage?: string;

  @Column({ type: 'integer', default: 0 })
  @ApiProperty({ description: 'Number of records created during seeding' })
  recordCount: number;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the seeding operation started', required: false })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the seeding operation completed', required: false })
  completedAt?: Date;

  @CreateDateColumn()
  @ApiProperty({ description: 'When the seeding record was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'When the seeding record was last updated' })
  updatedAt: Date;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiProperty({ description: 'User who initiated the seeding operation', required: false })
  @IsOptional()
  initiatedBy?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @ApiProperty({ description: 'Environment where seeding was performed', required: false })
  @IsOptional()
  environment?: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: 'Whether this seeding operation can be rolled back' })
  isRollbackable: boolean;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'ID of the parent seeding operation if this is a retry', required: false })
  @IsOptional()
  parentId?: string;

  calculateDuration(): number | null {
    if (!this.startedAt || !this.completedAt) return null;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  markAsStarted(): void {
    this.status = SeedingStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  markAsCompleted(results: Record<string, any>, recordCount: number): void {
    this.status = SeedingStatus.COMPLETED;
    this.completedAt = new Date();
    this.results = results;
    this.recordCount = recordCount;
  }

  markAsFailed(errorMessage: string): void {
    this.status = SeedingStatus.FAILED;
    this.completedAt = new Date();
    this.errorMessage = errorMessage;
  }
}
