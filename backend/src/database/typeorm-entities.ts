import { Campaign } from './entities/campaign.entity';
import { Conversation } from './entities/conversation.entity';
import { Lead } from './entities/lead.entity';
import { Message } from './entities/message.entity';
import { SpaBooking } from './entities/spa-booking.entity';
import { SpaPackage } from './entities/spa-package.entity';
import { SpaReview } from './entities/spa-review.entity';
import { SpaService } from './entities/spa-service.entity';
import { SpaTherapist } from './entities/spa-therapist.entity';
import { ClubEvent } from './entities/club-event.entity';
import { ClubEventRegistration } from './entities/club-event-registration.entity';
import { CafeOrder } from './entities/cafe-order.entity';
import { CafeProduct } from './entities/cafe-product.entity';
import { ApiKey } from './entities/api-key.entity';
import { Availability } from './entities/availability.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { FacilityAccessLog } from './entities/facility-access-log.entity';
import { HealthData } from './entities/health-data.entity';
import { AppNotification } from './entities/notification.entity';
import { PartnerApplication } from './entities/partner-application.entity';
import { PlatformAdminAuditLog } from './entities/platform-admin-audit-log.entity';
import { PackageRequest } from './entities/package-request.entity';
import { PackageType } from './entities/package-type.entity';
import { Package } from './entities/package.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Rating } from './entities/rating.entity';
import { Reservation } from './entities/reservation.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantVisibilityAudit } from './entities/tenant-visibility-audit.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { TrainerApplication } from './entities/trainer-application.entity';
import { TrainerMemberLink } from './entities/trainer-member-link.entity';
import { ConnectionRequest } from './entities/connection-request.entity';
import { Resource } from './entities/resource.entity';
import { ResourceSlot } from './entities/resource-slot.entity';
import { Booking } from './entities/booking.entity';
import { Addon } from './entities/addon.entity';
import { BookingAddon } from './entities/booking-addon.entity';
import { TrainerMemberNote } from './entities/trainer-member-note.entity';
import { TrainerProfile } from './entities/trainer-profile.entity';
import { Trainer } from './entities/trainer.entity';
import { User } from './entities/user.entity';
import { WaitingListEntry } from './entities/waiting-list.entity';

/** Registration order for TypeORM / migrations */
export const typeOrmEntities = [
  Tenant,
  TenantVisibilityAudit,
  Campaign,
  Conversation,
  Lead,
  Message,
  SpaBooking,
  SpaPackage,
  SpaReview,
  SpaService,
  SpaTherapist,
  CafeOrder,
  CafeProduct,
  ClubEvent,
  ClubEventRegistration,
  User,
  Trainer,
  TrainerProfile,
  TrainerApplication,
  TrainerMemberLink,
  ConnectionRequest,
  Resource,
  ResourceSlot,
  Booking,
  Addon,
  BookingAddon,
  TrainerMemberNote,
  PackageType,
  PackageRequest,
  Package,
  Availability,
  TimeSlot,
  Reservation,
  WaitingListEntry,
  DiscountCode,
  PaymentTransaction,
  HealthData,
  AppNotification,
  Rating,
  FacilityAccessLog,
  ApiKey,
  PartnerApplication,
  PlatformAdminAuditLog,
];
