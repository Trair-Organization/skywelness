import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Availability } from './availability.entity';
import { Trainer } from './trainer.entity';

@Entity({ name: 'time_slot' })
export class TimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'trainer_id' })
  trainerId!: string;

  @ManyToOne(() => Trainer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer;

  @Column({ type: 'uuid', nullable: true, name: 'availability_id' })
  availabilityId!: string | null;

  @ManyToOne(() => Availability, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'availability_id' })
  availability!: Availability | null;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'int', default: 1 })
  capacity!: number;

  @Column({ type: 'int', default: 0, name: 'booked_count' })
  bookedCount!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
