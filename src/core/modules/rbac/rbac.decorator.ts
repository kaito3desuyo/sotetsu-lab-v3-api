import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

export const RBAC_KEY = 'rbac';
export const RBAC = (...roles: Role[]) => SetMetadata(RBAC_KEY, roles);
