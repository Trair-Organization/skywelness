import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { ClubEventRegistration } from './club-event-registration.entity';

@Entity({ name: 'club_event' })
@Index(['tenantId', 'startsAt'])
export class ClubEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'coach_name' })
  coachName!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true, name: 'location' })
  location!: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'ends_at' })
  endsAt!: Date | null;

  @Column({ type: 'int', default: 30 })
  capacity!: number;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category!: string;

  /** Katılımcıların getirmesi gerekenler. */
  @Column({ type: 'text', nullable: true })
  requirements!: string | null;

  /** Etkinlik programı/ajanda (JSON array: [{time, title}]). */
  @Column({ type: 'jsonb', nullable: true })
  schedule!: Array<{ time: string; title: string }> | null;

  /** Katılım ücreti. 0 = ücretsiz etkinlik. */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price!: string;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ type: 'boolean', default: true })
  published!: boolean;

  /** Etkinlik durumu: draft, pending_approval, approved, rejected, cancelled */
  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: string;

  /** Etkinliği oluşturan kullanıcı (trainer veya admin) */
  @Column({ type: 'uuid', nullable: true, name: 'created_by_user_id' })
  createdByUserId!: string | null;

  /**
   * Tekrarlayan etkinlik kuralı (JSON).
   * Örn: { frequency: 'weekly', daysOfWeek: [2], endDate: '2026-06-30' }
   * null = tek seferlik etkinlik
   */
  @Column({ type: 'jsonb', nullable: true, name: 'recurring_rule' })
  recurringRule!: { frequency: 'daily' | 'weekly' | 'monthly'; daysOfWeek?: number[]; endDate?: string; interval?: number } | null;

  /** Parent event ID (recurring serisinin ilk etkinliği) */
  @Column({ type: 'uuid', nullable: true, name: 'parent_event_id' })
  parentEventId!: string | null;

  @OneToMany(() => ClubEventRegistration, (r) => r.event, { cascade: false })
  registrations?: ClubEventRegistration[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
