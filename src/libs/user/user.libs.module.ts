import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCommand } from './infrastructure/command/user.command.js';
import { UserAccessTraceCommand } from './infrastructure/command/user-access-trace.command.js';
import { ProfileModel } from './infrastructure/models/profile.model.js';
import { UserAccessTraceModel } from './infrastructure/models/user-access-trace.model.js';
import { UserAccessTraceQuery } from './infrastructure/queries/user-access-trace.query.js';
import { UserQuery } from './infrastructure/queries/user.query.js';
import { UserRoleQuery } from './infrastructure/queries/user-role.query.js';
import { UserAccessTraceService } from './usecase/user-access-trace.service.js';
import { UserRoleService } from './usecase/user-role.service.js';

/**
 * AuthGuard・RBACGuard は各 controller の module の中で作られる（@UseGuards）ので、
 * どの module からでも UserAccessTraceService・UserRoleService を引けるよう Global にする。
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([UserAccessTraceModel, ProfileModel])],
    exports: [
        UserAccessTraceQuery,
        UserAccessTraceService,
        UserQuery,
        UserCommand,
        UserRoleService,
    ],
    providers: [
        UserAccessTraceCommand,
        UserAccessTraceQuery,
        UserAccessTraceService,
        UserQuery,
        UserCommand,
        UserRoleQuery,
        UserRoleService,
    ],
})
export class UserLibsModule {}
