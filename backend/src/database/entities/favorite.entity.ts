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
 * Kullanıcı favorileri — kulüp veya eğitmen favorilere eklenebilir.
 * Trendyol'daki "beğendiklerim" gibi.
 */
@Entity({ name: 'favorite' })
@Index(['userId', 'targetType', 'targetId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Favori tipi: club veya trainer */
  @Column({ type: 'varchar', length: 20, name: 'target_type' })
  targetType!: 'club' | 'trainer';

  /** Hedef ID (tenant.id veya trainer.id) */
  @Column({ type: 'uuid', name: 'target_id' })
  targetId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
