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

@Entity({ name: 'event_review' })
@Index(['clubEventId', 'userId'], { unique: true })
export class EventReview {
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

  /** 1-5 yıldız */
  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
