import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'trainer' })
export class Trainer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  certifications!: unknown[] | null;

  @Column({ type: 'jsonb', nullable: true })
  specializations!: unknown[] | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'photo_url' })
  photoUrl!: string | null;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    name: 'avg_rating',
  })
  avgRating!: string;

  @Column({ type: 'int', default: 0, name: 'total_sessions' })
  totalSessions!: number;

  /** Which bookable service types this staff member offers (member UI filters by this). */
  @Column('text', {
    array: true,
    name: 'offers_session_types',
  })
  offersSessionTypes!: string[];

  /** Benzersiz davet kodu — öğrenciler bu kodla eğitmene bağlanır. */
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true, name: 'invite_code' })
  inviteCode!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
