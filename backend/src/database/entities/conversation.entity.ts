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

/**
 * İki kullanıcı arasındaki sohbet.
 * participantA her zaman ID'si küçük olan (sıralama tutarlılığı için).
 */
@Entity({ name: 'conversation' })
@Index(['participantAId', 'participantBId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'participant_a_id' })
  participantAId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_a_id' })
  participantA!: User;

  @Column({ type: 'uuid', name: 'participant_b_id' })
  participantBId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_b_id' })
  participantB!: User;

  /** Son mesajın önizlemesi (liste ekranında gösterilir). */
  @Column({ type: 'text', nullable: true, name: 'last_message_preview' })
  lastMessagePreview!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
  lastMessageAt!: Date | null;

  /** Son mesajı gönderen kullanıcı ID'si — gelen/gönderilen filtresi için. */
  @Column({ type: 'uuid', nullable: true, name: 'last_message_sender_id' })
  lastMessageSenderId!: string | null;

  /** A'nın okumadığı mesaj sayısı. */
  @Column({ type: 'int', default: 0, name: 'unread_count_a' })
  unreadCountA!: number;

  /** B'nin okumadığı mesaj sayısı. */
  @Column({ type: 'int', default: 0, name: 'unread_count_b' })
  unreadCountB!: number;

  /** A bu sohbeti silmiş mi (kendi tarafından gizli). */
  @Column({ type: 'boolean', default: false, name: 'deleted_by_a' })
  deletedByA!: boolean;

  /** B bu sohbeti silmiş mi. */
  @Column({ type: 'boolean', default: false, name: 'deleted_by_b' })
  deletedByB!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
