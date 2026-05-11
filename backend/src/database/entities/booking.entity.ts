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
import { ResourceSlot } from './resource-slot.entity';
import { Resource } from './resource.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

/**
 * Generic booking (rezervasyon).
 * Kort, oda, salon — her türlü kaynak için.
 */
@Entity({ name: 'booking' })
@Index(['tenantId', 'userId', 'status'])
@Index(['tenantId', 'resourceSlotId'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'resource_id' })
  resourceId!: string;

  @ManyToOne(() => Resource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resource_id' })
  resource!: Resource;

  @Column({ type: 'uuid', name: 'resource_slot_id' })
  resourceSlotId!: string;

  @ManyToOne(() => ResourceSlot, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resource_slot_id' })
  resourceSlot!: ResourceSlot;

  /** pending | confirmed | cancelled | completed */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'confirmed' | 'cancelled' | 'completed';

  /** Katılımcı sayısı (kort için 2-4 kişi) */
  @Column({ type: 'int', default: 1, name: 'participant_count' })
  participantCount!: number;

  /** Katılımcı isimleri (JSON) */
  @Column({ type: 'jsonb', nullable: true })
  participants!: Array<{ name: string; phone?: string }> | null;

  /** Toplam tutar (kaynak + add-on'lar) */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  /** Ödeme durumu: pending | paid | refunded | failed */
  @Column({ type: 'varchar', length: 20, default: 'pending', name: 'payment_status' })
  paymentStatus!: 'pending' | 'paid' | 'refunded' | 'failed';

  /** Stripe checkout session ID */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'stripe_session_id' })
  stripeSessionId!: string | null;

  /** Stripe payment intent ID */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'stripe_payment_intent_id' })
  stripePaymentIntentId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'cancelled_by' })
  cancelledBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
