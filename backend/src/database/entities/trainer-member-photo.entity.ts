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

@Entity({ name: 'trainer_member_photo' })
@Index(['trainerId', 'memberUserId', 'takenAt'])
export class TrainerMemberPhoto {
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

  @Column({ type: 'date', name: 'taken_at' })
  takenAt!: string;

  @Column({ type: 'varchar', length: 2048, name: 'photo_url' })
  photoUrl!: string;

  /** Etiket: 'before', 'after', 'month_1', 'month_3', 'side', 'front', 'back', vb. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  tag!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
