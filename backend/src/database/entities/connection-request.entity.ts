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
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

/**
 * Evrensel bağlantı isteği tablosu.
 *
 * Gönderen ve alıcı bir kullanıcı (user) veya bir kulüp (tenant) olabilir.
 * - sender_user_id + receiver_user_id: kullanıcı→kullanıcı (üye→eğitmen, eğitmen→üye)
 * - sender_tenant_id + receiver_user_id: kulüp→kullanıcı (kulüp eğitmen/üye davet eder)
 * - sender_user_id + receiver_tenant_id: kullanıcı→kulüp (eğitmen/üye kulübe başvurur)
 */
@Entity({ name: 'connection_request' })
@Index(['senderUserId', 'receiverUserId', 'status'])
@Index(['senderTenantId', 'receiverUserId', 'status'])
@Index(['senderUserId', 'receiverTenantId', 'status'])
export class ConnectionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Gönderen (kullanıcı veya kulüp)
  @Column({ type: 'uuid', nullable: true, name: 'sender_user_id' })
  senderUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'sender_tenant_id' })
  senderTenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sender_tenant_id' })
  senderTenant!: Tenant | null;

  // Alıcı (kullanıcı veya kulüp)
  @Column({ type: 'uuid', nullable: true, name: 'receiver_user_id' })
  receiverUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'receiver_user_id' })
  receiverUser!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'receiver_tenant_id' })
  receiverTenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'receiver_tenant_id' })
  receiverTenant!: Tenant | null;

  /**
   * Bağlantı tipi:
   * - trainer_to_club: eğitmen kulübe başvuruyor
   * - club_to_trainer: kulüp eğitmeni davet ediyor
   * - member_to_club: üye kulübe katılmak istiyor
   * - club_to_member: kulüp üyeyi davet ediyor
   * - member_to_trainer: üye eğitmene bağlanmak istiyor
   * - trainer_to_member: eğitmen öğrenci ekliyor
   */
  @Column({ type: 'varchar', length: 30, name: 'connection_type' })
  connectionType!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'text', nullable: true, name: 'reject_reason' })
  rejectReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'responded_at' })
  respondedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
