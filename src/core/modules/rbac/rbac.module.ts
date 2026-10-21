import { Module } from '@nestjs/common';
import { RBACGuard } from './rbac.guard.js';

@Module({
    providers: [RBACGuard],
})
export class RBACModule {}
