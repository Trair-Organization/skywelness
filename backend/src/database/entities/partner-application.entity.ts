import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'partner_application' })
export class PartnerApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180, name: 'company_name' })
  companyName!: string;

  @Column({ type: 'varchar', length: 180, name: 'contact_name' })
  contactName!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 40 })
  phone!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'int', nullable: true, name: 'club_count' })
  clubCount!: number | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'logo_url' })
  logoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'contacted' | 'approved' | 'rejected';

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
