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
import { User } from './user.entity';

export type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'fake_profile'
  | 'violence'
  | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

/**
 * Mesaj/Sohbet şikayet kaydı — App Store 1.2 zorunluluğu.
 * 24 saat içinde admin inceleme gerekir.
 */
@Entity({ name: 'message_report' })
@Index(['status', 'createdAt'])
@Index(['reportedUserId'])
export class MessageReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'reporter_user_id' })
  reporterUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_user_id' })
  reporter!: User;

  @Column({ type: 'uuid', name: 'reported_user_id' })
  reportedUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reported_user_id' })
  reported!: User;

  @Column({ type: 'uuid', nullable: true, name: 'conversation_id' })
  conversationId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'message_id' })
  messageId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  category!: ReportCategory;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: ReportStatus;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by_user_id' })
  reviewedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
