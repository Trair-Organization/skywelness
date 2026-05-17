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

@Entity({ name: 'event_waiting_list' })
@Index(['clubEventId', 'userId'], { unique: true })
export class EventWaitingList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_event_id' })
  clubEventId!: string;

  @ManyToOne(() => ClubEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_event_id' })
  event!: ClubEvent;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** active, notified, converted, expired */
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
