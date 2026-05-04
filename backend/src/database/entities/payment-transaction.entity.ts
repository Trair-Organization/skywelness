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
import { PaymentStatus } from '../enums';
import { DiscountCode } from './discount-code.entity';
import { Package } from './package.entity';
import { User } from './user.entity';

@Entity({ name: 'payment_transaction' })
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', nullable: true, name: 'package_id' })
  packageId!: string | null;

  @ManyToOne(() => Package, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'package_id' })
  package!: Package | null;

  @Column({ type: 'uuid', nullable: true, name: 'discount_code_id' })
  discountCodeId!: string | null;

  @ManyToOne(() => DiscountCode, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'discount_code_id' })
  discountCode!: DiscountCode | null;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_payment_intent_id',
  })
  stripePaymentIntentId!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'discount_amount',
  })
  discountAmount!: string;

  @Column({ type: 'varchar', length: 8, default: 'TRY' })
  currency!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'receipt_url' })
  receiptUrl!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, name: 'idempotency_key' })
  idempotencyKey!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
