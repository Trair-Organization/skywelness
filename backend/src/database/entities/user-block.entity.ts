import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Kullanıcı engelleme — App Store 1.2 (User-Generated Content) zorunluluğu.
 * blockerUserId, blockedUserId'yi engelledi.
 */
@Entity({ name: 'user_block' })
@Index(['blockerUserId', 'blockedUserId'], { unique: true })
@Index(['blockedUserId'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'blocker_user_id' })
  blockerUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_user_id' })
  blocker!: User;

  @Column({ type: 'uuid', name: 'blocked_user_id' })
  blockedUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_user_id' })
  blocked!: User;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
