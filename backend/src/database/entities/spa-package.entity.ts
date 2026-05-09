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

@Entity({ name: 'spa_package' })
@Index(['tenantId', 'active'])
export class SpaPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** Paket seans sayısı. */
  @Column({ type: 'int', name: 'session_count' })
  sessionCount!: number;

  /** Paket fiyatı (TL). */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string;

  @Column({ type: 'varchar', length: 8, default: 'TRY' })
  currency!: string;

  /** Geçerlilik süresi (gün). */
  @Column({ type: 'int', name: 'validity_days' })
  validityDays!: number;

  /** Bu paket hangi hizmetlerde kullanılabilir (boşsa tümünde). */
  @Column('text', { array: true, default: '{}', name: 'applicable_categories' })
  applicableCategories!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
