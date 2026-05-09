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

export type LeadSource = 'club' | 'trainer' | 'campaign' | 'event';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost';

@Entity({ name: 'lead' })
@Index(['tenantId', 'status'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Hangi kulübe ait lead. */
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40 })
  phone!: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  /** Lead kaynağı: kulüp, eğitmen, kampanya veya etkinlik. */
  @Column({ type: 'varchar', length: 20 })
  source!: LeadSource;

  /** Kaynak ID (kampanya ID, eğitmen ID, etkinlik ID vb.). */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'source_ref' })
  sourceRef!: string | null;

  /** Kaynak açıklaması (kampanya adı, eğitmen adı vb.). */
  @Column({ type: 'varchar', length: 300, nullable: true, name: 'source_label' })
  sourceLabel!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status!: LeadStatus;

  /** Admin notu. */
  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
