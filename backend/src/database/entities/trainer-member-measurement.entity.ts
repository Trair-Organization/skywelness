import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

@Entity({ name: 'trainer_member_measurement' })
@Index(['trainerId', 'memberUserId', 'measuredAt'])
export class TrainerMemberMeasurement {
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

  @Column({ type: 'date', name: 'measured_at' })
  measuredAt!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, name: 'weight_kg' })
  weightKg!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, name: 'height_cm' })
  heightCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'body_fat_pct' })
  bodyFatPct!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, name: 'muscle_mass_kg' })
  muscleMassKg!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true, name: 'waist_cm' })
  waistCm!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true, name: 'hip_cm' })
  hipCm!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true, name: 'chest_cm' })
  chestCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'biceps_left_cm' })
  bicepsLeftCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'biceps_right_cm' })
  bicepsRightCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'thigh_left_cm' })
  thighLeftCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'thigh_right_cm' })
  thighRightCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'calf_left_cm' })
  calfLeftCm!: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, name: 'calf_right_cm' })
  calfRightCm!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
