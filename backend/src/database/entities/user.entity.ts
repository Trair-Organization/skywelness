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
import { MemberAccountStatus, UserRole } from '../enums';
import { Tenant } from './tenant.entity';

@Entity({ name: 'user' })
@Index(['tenantId', 'email'], { unique: true })
@Index(['tenantId', 'username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 40 })
  username!: string;

  /** Benzersiz herkese açık ID: MBR-0001, TRN-0001 */
  @Column({ type: 'varchar', length: 12, nullable: true, unique: true, name: 'public_id' })
  publicId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120, name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', length: 120, name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'photo_url' })
  photoUrl!: string | null;

  @Column({ type: 'varchar', length: 32 })
  role!: UserRole;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'account_status',
    default: MemberAccountStatus.ACTIVE,
  })
  accountStatus!: MemberAccountStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'emergency_contact' })
  emergencyContact!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'notification_preferences' })
  notificationPreferences!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login' })
  lastLogin!: Date | null;

  @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'locked_until' })
  lockedUntil!: Date | null;

  @Column({ type: 'int', default: 0, name: 'refresh_token_version' })
  refreshTokenVersion!: number;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'reset_password_token_hash' })
  resetPasswordTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reset_password_expires_at' })
  resetPasswordExpiresAt!: Date | null;

  @Column({ type: 'boolean', default: false, name: 'is_guest' })
  isGuest!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
