import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

/**
 * Kulüp işlem kayıtları — admin panelinde yapılan tüm işlemler.
 * Silinemez, değiştirilemez (append-only).
 */
@Entity({ name: 'club_audit_log' })
export class ClubAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  actorUserId!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: User;

  /** İşlem tipi: member_created, member_deleted, package_assigned, password_reset, etc. */
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  /** Hedef entity tipi: user, package, membership, etc. */
  @Column({ type: 'varchar', length: 50, name: 'target_type', nullable: true })
  targetType!: string | null;

  /** Hedef entity ID */
  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId!: string | null;

  /** İşlem detayı (JSON) */
  @Column({ type: 'jsonb', default: '{}' })
  details!: Record<string, unknown>;

  /** IP adresi */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
