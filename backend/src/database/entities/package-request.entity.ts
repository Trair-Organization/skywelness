import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

@Entity({ name: 'package_request' })
export class PackageRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 64, name: 'session_type' })
  sessionType!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'preferred_trainer_id' })
  preferredTrainerId!: string | null;

  @ManyToOne(() => Trainer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'preferred_trainer_id' })
  preferredTrainer!: Trainer | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
