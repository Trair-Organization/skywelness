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

@Entity({ name: 'spa_therapist' })
@Index(['tenantId', 'active'])
export class SpaTherapist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'photo_url' })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  /** Uzmanlık alanları (masaj türleri). */
  @Column('text', { array: true, default: '{}' })
  specialties!: string[];

  /** Çalışma saatleri (JSON: { mon: "10:00-20:00", tue: "10:00-20:00", ... }). */
  @Column({ type: 'jsonb', nullable: true, name: 'working_hours' })
  workingHours!: Record<string, string> | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0, name: 'avg_rating' })
  avgRating!: string;

  @Column({ type: 'int', default: 0, name: 'total_sessions' })
  totalSessions!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
