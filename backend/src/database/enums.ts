export enum UserRole {
  MEMBER = 'member',
  TRAINER = 'trainer',
  INDEPENDENT_TRAINER = 'independent_trainer',
  ADMINISTRATOR = 'administrator',
  PLATFORM_ADMIN = 'platform_admin',
}

/** Member self-registration lifecycle (trainers/admins default to active). */
export enum MemberAccountStatus {
  ACTIVE = 'active',
  PENDING_APPROVAL = 'pending_approval',
  REJECTED = 'rejected',
}

export enum SessionType {
  PERSONAL_TRAINING = 'personal_training',
  MASSAGE = 'massage',
  EVENT = 'event',
  OTHER = 'other',
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PackageStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DEPLETED = 'depleted',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum WaitingListStatus {
  ACTIVE = 'active',
  NOTIFIED = 'notified',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export enum NotificationType {
  RESERVATION = 'reservation',
  REMINDER = 'reminder',
  PACKAGE = 'package',
  SYSTEM = 'system',
  PROMOTION = 'promotion',
}
