import { Module } from '@nestjs/common';
import {
    OperationSightingCliCommand,
    RebuildLatestCacheCommand,
} from './presentation/operation-sighting.cli.command.js';
import { OperationSightingLibsModule } from './operation-sighting.libs.module.js';
import { OperationSightingCliService } from './usecase/operation-sighting.cli.service.js';

@Module({
    imports: [OperationSightingLibsModule],
    providers: [
        OperationSightingCliCommand,
        RebuildLatestCacheCommand,
        OperationSightingCliService,
    ],
})
export class OperationSightingCliModule {}
