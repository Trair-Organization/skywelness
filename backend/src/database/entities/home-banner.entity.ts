import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('home_banners')
export class HomeBanner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Başlık (slider üzerinde gösterilir). */
  @Column({ length: 200 })
  title!: string;

  /** Alt başlık / açıklama. */
  @Column({ type: 'text', nullable: true, default: null })
  subtitle!: string | null;

  /** Banner görseli URL. */
  @Column({ type: 'varchar', length: 2048 })
  imageUrl!: string;

  /** Tıklanınca gidilecek link (opsiyonel). */
  @Column({ type: 'varchar', length: 2048, nullable: true, default: null })
  linkUrl!: string | null;

  /** CTA buton metni (opsiyonel). */
  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  buttonText!: string | null;

  /** Sıralama (küçük = önce). */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /** Aktif mi? */
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
