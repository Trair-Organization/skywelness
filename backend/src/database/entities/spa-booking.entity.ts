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
import { SpaService } from './spa-service.entity';
import { SpaTherapist } from './spa-therapist.entity';

export type SpaBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

@Entity({ name: 'spa_booking' })
@Index(['tenantId', 'status'])
@Index(['userId', 'bookingDate'])
@Index(['therapistId', 'bookingDate'])
export class SpaBooking {
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

  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @ManyToOne(() => SpaService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: SpaService;

  @Column({ type: 'uuid', name: 'therapist_id', nullable: true })
  therapistId!: string | null;

  @ManyToOne(() => SpaTherapist, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'therapist_id' })
  therapist!: SpaTherapist | null;

  /** Kullanıcının spa paketi ID'si (varsa seans düşülür). */
  @Column({ type: 'uuid', nullable: true, name: 'package_id' })
  packageId!: string | null;

  @Column({ type: 'date', name: 'booking_date' })
  bookingDate!: string;

  /** Saat dilimi: "14:00" formatında. */
  @Column({ type: 'varchar', length: 10, name: 'time_slot' })
  timeSlot!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: SpaBookingStatus;

  /** Kullanıcı notu (özel istek, alerji vb.). */
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Admin notu (iç kullanım). */
  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
