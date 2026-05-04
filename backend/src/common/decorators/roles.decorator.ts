import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../database/enums';

export const ROLES_KEY = 'roles';

/** Require JWT user role to be one of the listed roles (use with JwtAuthGuard + RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
