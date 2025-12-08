import { Module } from '@nestjs/common';
import { RBACGuard } from './rbac.guard';

@Module({
    providers: [RBACGuard],
})
export class RBACModule {}
