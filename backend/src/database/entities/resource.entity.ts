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

/**
 * Rezerve edilebilir kaynak (Kort, Oda, Salon, Yatak, vb.)
 * Her tenant kendi kaynaklarını tanımlar.
 */
@Entity({ name: 'resource' })
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** Kaynak tipi: court, room, bed, chair, studio, etc. */
  @Column({ type: 'varchar', length: 50, name: 'resource_type' })
  resourceType!: string;

  /** Kapasite (kort: 4 kişi, oda: 1 kişi, vb.) */
  @Column({ type: 'int', default: 1 })
  capacity!: number;

  /** Varsayılan seans süresi (dakika) */
  @Column({ type: 'int', name: 'duration_minutes', default: 60 })
  durationMinutes!: number;

  /** Seans başı fiyat */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: string;

  /** Para birimi */
  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
