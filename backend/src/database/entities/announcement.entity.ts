import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'announcement' })
@Index(['tenantId', 'createdAt'])
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  /** Hedef: all, members, staff */
  @Column({ type: 'varchar', length: 20, default: 'all' })
  target!: string;

  /** Kaç kişiye gönderildi */
  @Column({ type: 'int', default: 0, name: 'recipient_count' })
  recipientCount!: number;

  /** Kaç kişi okudu */
  @Column({ type: 'int', default: 0, name: 'read_count' })
  readCount!: number;

  /** Push notification gönderildi mi */
  @Column({ type: 'boolean', default: true, name: 'push_sent' })
  pushSent!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
