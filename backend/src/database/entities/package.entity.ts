import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageStatus } from '../enums';
import { PackageType } from './package-type.entity';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

@Entity({ name: 'package' })
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'package_type_id' })
  packageTypeId!: string;

  @ManyToOne(() => PackageType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'package_type_id' })
  packageType!: PackageType;

  @Column({ type: 'int', name: 'remaining_sessions' })
  remainingSessions!: number;

  @Column({ type: 'date', name: 'expires_at' })
  expiresAt!: string;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_trainer_id' })
  assignedTrainerId!: string | null;

  @ManyToOne(() => Trainer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_trainer_id' })
  assignedTrainer!: Trainer | null;

  @Column({ type: 'varchar', length: 32 })
  status!: PackageStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
