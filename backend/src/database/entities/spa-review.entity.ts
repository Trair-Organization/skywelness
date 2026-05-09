import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SpaBooking } from './spa-booking.entity';
import { SpaTherapist } from './spa-therapist.entity';

@Entity({ name: 'spa_review' })
export class SpaReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId!: string;

  @ManyToOne(() => SpaBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: SpaBooking;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'therapist_id', nullable: true })
  therapistId!: string | null;

  @ManyToOne(() => SpaTherapist, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'therapist_id' })
  therapist!: SpaTherapist | null;

  /** 1-5 arası puan. */
  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
