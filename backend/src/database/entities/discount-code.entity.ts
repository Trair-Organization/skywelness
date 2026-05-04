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
import { DiscountType } from '../enums';
import { Tenant } from './tenant.entity';

@Entity({ name: 'discount_code' })
@Index(['tenantId', 'code'], { unique: true })
export class DiscountCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 32, name: 'discount_type' })
  discountType!: DiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'discount_value' })
  discountValue!: string;

  @Column({ type: 'date', name: 'valid_from' })
  validFrom!: string;

  @Column({ type: 'date', name: 'valid_until' })
  validUntil!: string;

  @Column({ type: 'int', name: 'usage_limit', nullable: true })
  usageLimit!: number | null;

  @Column({ type: 'int', default: 0, name: 'usage_count' })
  usageCount!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
