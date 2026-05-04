import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ReservationStatus, SessionType } from '../enums';
import { Package } from './package.entity';
import { Tenant } from './tenant.entity';
import { TimeSlot } from './time-slot.entity';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

@Entity({ name: 'reservation' })
@Index(['tenantId', 'userId', 'startTime'])
@Index(['tenantId', 'trainerId', 'startTime'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'trainer_id' })
  trainerId!: string;

  @ManyToOne(() => Trainer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => Package, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'package_id' })
  package!: Package;

  @Column({ type: 'uuid', name: 'time_slot_id' })
  timeSlotId!: string;

  @ManyToOne(() => TimeSlot, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'time_slot_id' })
  timeSlot!: TimeSlot;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 64, name: 'session_type' })
  sessionType!: SessionType;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: ReservationStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
