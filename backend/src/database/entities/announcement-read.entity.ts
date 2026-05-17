import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from './user.entity';

@Entity({ name: 'announcement_read' })
@Index(['announcementId', 'userId'], { unique: true })
export class AnnouncementRead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'announcement_id' })
  announcementId!: string;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement!: Announcement;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'read_at' })
  readAt!: Date;
}
