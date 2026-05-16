import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TenantVisibilityMode = 'public' | 'private';

@Entity({ name: 'tenant' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  subdomain!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'logo_url' })
  logoUrl!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'cover_image_url' })
  coverImageUrl!: string | null;

  @Column('text', { array: true, default: '{}' })
  services!: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'price_range' })
  priceRange!: string | null;

  @Column({ type: 'boolean', default: false })
  featured!: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0, name: 'avg_rating' })
  avgRating!: string;

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount!: number;

  @Column({ type: 'jsonb', default: {} })
  branding!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  /** Benzersiz kulüp davet kodu — eğitmenler bu kodla kulübe başvurur. */
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true, name: 'invite_code' })
  inviteCode!: string | null;

  /** Benzersiz herkese açık ID: CLB-0001 */
  @Column({ type: 'varchar', length: 12, nullable: true, unique: true, name: 'public_id' })
  publicId!: string | null;

  /** İş alanı: wellness, padel, beauty, fitness, medical, other */
  @Column({ type: 'varchar', length: 30, default: 'wellness' })
  vertical!: string;

  /**
   * Partner kulüp erişim modeli.
   * - public → platformdaki herkes üye olmadan rezervasyon yapabilir (marketplace)
   * - private → sadece onaylı üyeler hizmetleri görüp rezervasyon yapabilir
   *
   * workspaceType !== 'partner_club' olan tenant'larda bu alan yetkilendirmede
   * dikkate alınmaz (Req 1.5).
   */
  @Column({ type: 'varchar', length: 10, default: 'private', name: 'visibility_mode' })
  visibilityMode!: TenantVisibilityMode;

  /** Profil sayfası galeri fotoğrafları (slider). URL array. */
  @Column({ type: 'jsonb', default: '[]', name: 'gallery_images' })
  galleryImages!: string[];

  /**
   * Platform komisyon oranı (0.00 – 1.00).
   * Varsayılan 0.15 (%15). Süper Admin panelinden partner bazlı ayarlanabilir.
   * Checkout'ta toplam tutarın bu oranı kapora olarak alınır.
   */
  @Column({ type: 'numeric', precision: 4, scale: 3, default: 0.15, name: 'commission_rate' })
  commissionRate!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
