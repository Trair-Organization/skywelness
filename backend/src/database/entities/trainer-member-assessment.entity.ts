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

/**
 * Değerlendirme tipleri:
 * - 'fms'        → Functional Movement Screen (7 test, 0-3 puan)
 * - 'posture'    → Statik postür analizi (önden/yandan/arkadan)
 * - 'vo2_max'    → VO2 max kardio kapasitesi testi
 * - 'flexibility'→ Esneklik testi
 * - 'strength'   → Kuvvet testi (1RM, max rep vb.)
 * - 'custom'     → Eğitmenin özel oluşturduğu test
 */
export type AssessmentType =
  | 'fms'
  | 'posture'
  | 'vo2_max'
  | 'flexibility'
  | 'strength'
  | 'custom';

@Entity({ name: 'trainer_member_assessment' })
@Index(['trainerId', 'memberUserId', 'assessedAt'])
@Index(['type'])
export class TrainerMemberAssessment {
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

  @Column({ type: 'date', name: 'assessed_at' })
  assessedAt!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: AssessmentType;

  /**
   * FMS örnek: { deepSquat: 3, hurdleStepLeft: 2, hurdleStepRight: 3, ... }
   * Posture örnek: { front: { headTilt: 'left', shoulderHigh: 'right' }, side: {...} }
   * VO2 Max örnek: { protocol: 'cooper', distanceM: 2400, ageYears: 30, restingHr: 60, score: 45 }
   */
  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
