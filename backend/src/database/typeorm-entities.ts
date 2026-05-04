import { ApiKey } from './entities/api-key.entity';
import { Availability } from './entities/availability.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { FacilityAccessLog } from './entities/facility-access-log.entity';
import { HealthData } from './entities/health-data.entity';
import { AppNotification } from './entities/notification.entity';
import { PackageType } from './entities/package-type.entity';
import { Package } from './entities/package.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Rating } from './entities/rating.entity';
import { Reservation } from './entities/reservation.entity';
import { Tenant } from './entities/tenant.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Trainer } from './entities/trainer.entity';
import { User } from './entities/user.entity';
import { WaitingListEntry } from './entities/waiting-list.entity';

/** Registration order for TypeORM / migrations */
export const typeOrmEntities = [
  Tenant,
  User,
  Trainer,
  PackageType,
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
];
