import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum.js';

export const RBAC_KEY = 'rbac';
export const RBAC = (...roles: Role[]) => SetMetadata(RBAC_KEY, roles);
