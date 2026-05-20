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
import { User } from './user.entity';

export type GoalCategory =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'fat_loss'
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'rehab'
  | 'general';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

@Entity({ name: 'trainer_member_goal' })
@Index(['trainerId', 'memberUserId', 'status'])
export class TrainerMemberGoal {
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

  @Column({ type: 'uuid', name: 'member_user_id' })
  memberUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_user_id' })
  memberUser!: User;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'general' })
  category!: GoalCategory;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, name: 'target_value' })
  targetValue!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'target_unit' })
  targetUnit!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, name: 'start_value' })
  startValue!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, name: 'current_value' })
  currentValue!: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string;

  @Column({ type: 'date', nullable: true, name: 'target_date' })
  targetDate!: string | null;

  @Column({ type: 'date', nullable: true, name: 'completed_at' })
  completedAt!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: GoalStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
