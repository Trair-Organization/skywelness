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

  @Column({ type: 'boolean', default: true })
  published!: boolean;

  @OneToMany(() => ClubEventRegistration, (r) => r.event, { cascade: false })
  registrations?: ClubEventRegistration[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
