import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpaTherapist } from './spa-therapist.entity';
import { Trainer } from './trainer.entity';

@Entity({ name: 'availability' })
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'trainer_id' })
  trainerId!: string | null;

  @ManyToOne(() => Trainer, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer | null;

  @Column({ type: 'uuid', nullable: true, name: 'spa_therapist_id' })
  spaTherapistId!: string | null;

  @ManyToOne(() => SpaTherapist, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'spa_therapist_id' })
  spaTherapist!: SpaTherapist | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time', name: 'start_time' })
  startTime!: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime!: string;

  @Column({ type: 'boolean', default: true })
  available!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
