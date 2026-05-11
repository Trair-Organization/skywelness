import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { TenantVisibilityMode } from './tenant.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export type VisibilityChangeSource = 'club_admin' | 'platform_admin';

@Entity({ name: 'tenant_visibility_audit' })
@Index(['tenantId', 'changedAt'])
export class TenantVisibilityAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', nullable: true, name: 'changed_by_user_id' })
  changedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser!: User | null;

  @Column({ type: 'varchar', length: 10, name: 'previous_value' })
  previousValue!: TenantVisibilityMode;

  @Column({ type: 'varchar', length: 10, name: 'new_value' })
  newValue!: TenantVisibilityMode;

  @Column({ type: 'varchar', length: 20 })
  source!: VisibilityChangeSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'changed_at' })
  changedAt!: Date;
}
