import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Trainer } from './trainer.entity';

export type Exercise = {
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  restSec?: number;
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
  day?: string;
  group?: string;
};

@Entity({ name: 'trainer_workout_program' })
@Index(['trainerId'])
export class TrainerWorkoutProgram {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'trainer_id' })
  trainerId!: string;

  @ManyToOne(() => Trainer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'general' })
  category!: string;

  @Column({ type: 'int', nullable: true, name: 'duration_weeks' })
  durationWeeks!: number | null;

  @Column({ type: 'int', nullable: true, name: 'frequency_per_week' })
  frequencyPerWeek!: number | null;

  @Column({ type: 'jsonb', default: [] })
  exercises!: Exercise[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
