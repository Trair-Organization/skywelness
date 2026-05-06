import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'platform_admin_audit_log' })
@Index(['createdAt'])
@Index(['action', 'createdAt'])
export class PlatformAdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 80, name: 'target_type' })
  targetType!: string;

  @Column({ type: 'varchar', length: 100, name: 'target_id' })
  targetId!: string;

  @Column({ type: 'jsonb', default: {} })
  details!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
