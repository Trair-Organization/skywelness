import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Trainer } from './trainer.entity';
import { User } from './user.entity';

/**
 * Eğitmen (trainer) değerlendirmesi.
 * Bir kullanıcı aynı eğitmene yalnızca bir kez puan verebilir.
 * Yalnızca eğitmenle tamamlanmış en az bir dersi olan üyeler yorum bırakabilir.
 */
@Entity({ name: 'trainer_review' })
@Index(['trainerId', 'userId'], { unique: true })
export class TrainerReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'trainer_id' })
  trainerId!: string;

  @ManyToOne(() => Trainer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainer_id' })
  trainer!: Trainer;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** 1-5 yıldız */
  @Column({ type: 'int' })
  rating!: number;

  /** Yorum metni (opsiyonel) */
  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
