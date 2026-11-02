import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingAuthorModel } from '../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingModel } from '../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { UserAccessTraceModel } from '../../core/modules/access-trace/user-access-trace.model.js';
import { ProfileModel } from '../user/infrastructure/models/profile.model.js';
import { UserRoleChangeCommand } from './infrastructure/command/user-role-change.command.js';
import { ModerationQuery } from './infrastructure/queries/moderation.query.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OperationSightingModel,
            OperationSightingAuthorModel,
            ProfileModel,
            UserAccessTraceModel,
        ]),
    ],
    exports: [ModerationQuery, UserRoleChangeCommand],
    providers: [ModerationQuery, UserRoleChangeCommand],
})
export class ModerationLibsModule {}
