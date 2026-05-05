import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

@Entity({ name: 'trainer_profile' })
export class TrainerProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'trainer_id' })
  trainerId!: string;

  @ManyToOne(() => Trainer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'text' })
  bio!: string;

  @Column({ type: 'text', array: true })
  specialties!: string[];

  @Column({ type: 'text', array: true, nullable: true })
  certifications!: string[] | null;

  @Column({ type: 'int', nullable: true, name: 'experience_years' })
  experienceYears!: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'social_links' })
  socialLinks!: { links: string[] } | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'photo_url' })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'pricing_note' })
  pricingNote!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
