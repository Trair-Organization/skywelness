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
import { Resource } from './resource.entity';
import { Tenant } from './tenant.entity';

/**
 * Kaynağın müsaitlik slotu.
 * Her slot bir tarih + saat aralığı.
 */
@Entity({ name: 'resource_slot' })
@Index(['resourceId', 'date', 'startTime'])
@Index(['tenantId', 'date', 'status'])
export class ResourceSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'resource_id' })
  resourceId!: string;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource!: Resource;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 5, name: 'start_time' })
  startTime!: string;

  @Column({ type: 'varchar', length: 5, name: 'end_time' })
  endTime!: string;

  /** Fiyat (slot bazında override edilebilir, yoksa resource.price kullanılır) */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: string | null;

  /** available | booked | blocked */
  @Column({ type: 'varchar', length: 20, default: 'available' })
  status!: 'available' | 'booked' | 'blocked';

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
