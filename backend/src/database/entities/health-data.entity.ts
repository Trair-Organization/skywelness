import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'health_data' })
@Index(['userId', 'date'], { unique: true })
export class HealthData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'int', default: 0 })
  steps!: number;

  @Column({ type: 'int', default: 0, name: 'calories_burned' })
  caloriesBurned!: number;

  @Column({ type: 'int', default: 0, name: 'workout_duration' })
  workoutDuration!: number;

  @Column({ type: 'int', nullable: true, name: 'heart_rate' })
  heartRate!: number | null;

  @Column({ type: 'int', nullable: true })
  distance!: number | null;

  @Column({ type: 'timestamptz', name: 'synced_at' })
  syncedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
