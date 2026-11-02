import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingAuthorModel } from '../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingModel } from '../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../user/infrastructure/models/profile.model.js';
import { ModerationQuery } from './infrastructure/queries/moderation.query.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OperationSightingModel,
            OperationSightingAuthorModel,
            ProfileModel,
        ]),
    ],
    exports: [ModerationQuery],
    providers: [ModerationQuery],
})
export class ModerationLibsModule {}
