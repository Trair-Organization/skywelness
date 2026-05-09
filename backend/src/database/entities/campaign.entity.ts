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

export type CampaignType = 'massage_package' | 'membership' | 'personal_training' | 'general';
export type CampaignStatus = 'active' | 'draft' | 'expired' | 'paused';
export type DiscountKind = 'percentage' | 'fixed';
export type CampaignAudience = 'everyone' | 'new_members' | 'existing_members';

@Entity({ name: 'campaign' })
@Index(['tenantId', 'status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 40, name: 'campaign_type' })
  campaignType!: CampaignType;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: CampaignStatus;

  @Column({ type: 'varchar', length: 20, name: 'discount_kind' })
  discountKind!: DiscountKind;

  /** Yüzde ise 0-100 arası, sabit ise TL cinsinden tutar. */
  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'discount_value' })
  discountValue!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'everyone' })
  audience!: CampaignAudience;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'timestamptz', name: 'ends_at' })
  endsAt!: Date;

  /** Maksimum kullanım sayısı. null = sınırsız. */
  @Column({ type: 'int', nullable: true, name: 'max_redemptions' })
  maxRedemptions!: number | null;

  /** Şu ana kadar kaç kez kullanıldı. */
  @Column({ type: 'int', default: 0, name: 'redemption_count' })
  redemptionCount!: number;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ type: 'int', default: 0, name: 'click_count' })
  clickCount!: number;

  /** Platform admin tarafından keşif ekranında öne çıkarılmış kampanya. */
  @Column({ type: 'boolean', default: false })
  featured!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
