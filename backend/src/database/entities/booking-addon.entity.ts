import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Addon } from './addon.entity';

/**
 * Booking'e eklenen add-on (ek hizmet/ürün).
 */
@Entity({ name: 'booking_addon' })
export class BookingAddon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId!: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ type: 'uuid', name: 'addon_id' })
  addonId!: string;

  @ManyToOne(() => Addon, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'addon_id' })
  addon!: Addon;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  /** Birim fiyat (addon.price snapshot) */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: string;

  /** Toplam (quantity * unitPrice) */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice!: string;
}
