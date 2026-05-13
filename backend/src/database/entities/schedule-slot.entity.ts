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
import { ServiceCatalog } from './service-catalog.entity';

@Entity({ name: 'schedule_slot' })
export class ScheduleSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @ManyToOne(() => ServiceCatalog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceCatalog;

  @Column({ type: 'varchar', length: 50, name: 'provider_type' })
  providerType!: string;

  @Column({ type: 'uuid', nullable: true, name: 'provider_id' })
  providerId!: string | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 5, name: 'start_time' })
  startTime!: string;

  @Column({ type: 'varchar', length: 5, name: 'end_time' })
  endTime!: string;

  @Column({ type: 'int', default: 1 })
  capacity!: number;

  @Column({ type: 'int', default: 0, name: 'booked_count' })
  bookedCount!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price!: string;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
