import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WaitingListStatus } from '../enums';
import { TimeSlot } from './time-slot.entity';
import { User } from './user.entity';

@Entity({ name: 'waiting_list' })
export class WaitingListEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'time_slot_id' })
  timeSlotId!: string;

  @ManyToOne(() => TimeSlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'time_slot_id' })
  timeSlot!: TimeSlot;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'notified_at' })
  notifiedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', length: 32 })
  status!: WaitingListStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
