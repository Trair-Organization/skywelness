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
 * Üyenin kişisel takvim kaydı.
 * Platform dersleri/etkinlikleri ayrı tablolarda — burası sadece üyenin kendi eklediği plan.
 */
@Entity({ name: 'member_calendar_entry' })
@Index(['userId', 'date'])
export class MemberCalendarEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'date' })
  date!: string;

  /** Saat (HH:MM). null = tüm gün etkinliği */
  @Column({ type: 'varchar', length: 5, nullable: true, name: 'start_time' })
  startTime!: string | null;

  /** Bitiş saati (HH:MM). null = süresiz veya tüm gün */
  @Column({ type: 'varchar', length: 5, nullable: true, name: 'end_time' })
  endTime!: string | null;

  /**
   * Kategori: kullanıcının hayat alanını belirler.
   * workout, nutrition, sleep, hydration, meditation, personal, other
   */
  @Column({ type: 'varchar', length: 30, default: 'personal' })
  category!: string;

  /** Renk kodu (hex) — takvimde görsel ayrım */
  @Column({ type: 'varchar', length: 7, default: '#f59e0b' })
  color!: string;

  /** Tamamlandı mı? (checkbox özelliği) */
  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  /** Tekrar kuralı (null = tekrar etmez) */
  @Column({ type: 'jsonb', nullable: true, name: 'recurring_rule' })
  recurringRule!: { frequency: 'daily' | 'weekly' | 'monthly'; endDate?: string } | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
