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
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { ScheduleSlot } from './schedule-slot.entity';
import { ServiceCatalog } from './service-catalog.entity';

@Entity({ name: 'appointment' })
export class Appointment {
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

  @Column({ type: 'uuid', name: 'slot_id' })
  slotId!: string;

  @ManyToOne(() => ScheduleSlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slot_id' })
  slot!: ScheduleSlot;

  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @ManyToOne(() => ServiceCatalog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceCatalog;

  @Column({ type: 'varchar', length: 50, name: 'provider_type' })
  providerType!: string;

  @Column({ type: 'uuid', nullable: true, name: 'provider_id' })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, name: 'total_amount' })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ type: 'varchar', length: 30, default: 'pending', name: 'payment_status' })
  paymentStatus!: string;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'payment_method' })
  paymentMethod!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'package_id' })
  packageId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'cancelled_by' })
  cancelledBy!: string | null;

  @Column({ type: 'text', nullable: true, name: 'cancel_reason' })
  cancelReason!: string | null;

  @Column({ type: 'int', default: 1, name: 'participant_count' })
  participantCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  participants!: unknown[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'stripe_session_id' })
  @Index({ unique: false })
  stripeSessionId!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'stripe_payment_intent_id' })
  stripePaymentIntentId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
