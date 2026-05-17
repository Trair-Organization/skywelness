import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClubEvent } from './club-event.entity';
import { User } from './user.entity';

@Entity({ name: 'club_event_registration' })
@Index(['clubEventId', 'userId'], { unique: true })
export class ClubEventRegistration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_event_id' })
  clubEventId!: string;

  @ManyToOne(() => ClubEvent, (e) => e.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_event_id' })
  event!: ClubEvent;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Ödeme durumu: free, pending, paid, refunded */
  @Column({ type: 'varchar', length: 20, default: 'free', name: 'payment_status' })
  paymentStatus!: string;

  /** Kapora tutarı */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, name: 'deposit_amount' })
  depositAmount!: string;

  /** Check-in yapıldı mı */
  @Column({ type: 'boolean', default: false, name: 'checked_in' })
  checkedIn!: boolean;

  /** Check-in zamanı */
  @Column({ type: 'timestamptz', nullable: true, name: 'checked_in_at' })
  checkedInAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
