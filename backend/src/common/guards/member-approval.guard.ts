import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { MemberAccountStatus, UserRole } from '../../database/enums';
import type { User } from '../../database/entities/user.entity';

/**
 * Blocks MEMBER / INDEPENDENT_TRAINER accounts that are not ACTIVE (pending / rejected).
 * Other roles pass through.
 */
@Injectable()
export class MemberApprovalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }
    if (user.role !== UserRole.MEMBER && user.role !== UserRole.INDEPENDENT_TRAINER) {
      return true;
    }
    if (user.accountStatus === MemberAccountStatus.ACTIVE) {
      return true;
    }
    if (user.accountStatus === MemberAccountStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Membership is not approved yet');
    }
    if (user.accountStatus === MemberAccountStatus.REJECTED) {
      throw new ForbiddenException('Membership was not accepted');
    }
    throw new ForbiddenException('Membership is not active');
  }
}
