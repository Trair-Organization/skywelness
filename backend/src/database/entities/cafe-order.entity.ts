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

export type CafeOrderItem = {
  productId: string;
  title: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
};

export type CafePaymentMethod = 'cash' | 'card';
export type CafeOrderStatus = 'pending' | 'cancelled' | 'completed';

@Entity({ name: 'cafe_order' })
@Index(['tenantId', 'createdAt'])
@Index(['memberUserId', 'createdAt'])
export class CafeOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'member_user_id' })
  memberUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_user_id' })
  memberUser!: User;

  @Column({ type: 'varchar', length: 120, name: 'customer_name' })
  customerName!: string;

  @Column({ type: 'varchar', length: 64, name: 'block_label' })
  blockLabel!: string;

  @Column({ type: 'varchar', length: 64, name: 'apartment_label' })
  apartmentLabel!: string;

  @Column({ type: 'varchar', length: 40, name: 'phone_number' })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 16, name: 'payment_method' })
  paymentMethod!: CafePaymentMethod;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: CafeOrderStatus;

  @Column({ type: 'jsonb', name: 'items_json' })
  itemsJson!: CafeOrderItem[];

  @Column({ type: 'int', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
