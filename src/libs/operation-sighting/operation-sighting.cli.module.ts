import { Module } from '@nestjs/common';
import {
    OperationSightingCliCommand,
    RebuildLatestCacheCommand,
} from './presentation/operation-sighting.cli.command';
import { OperationSightingLibsModule } from './operation-sighting.libs.module';
import { OperationSightingCliService } from './usecase/operation-sighting.cli.service';

@Module({
    imports: [OperationSightingLibsModule],
    providers: [
        OperationSightingCliCommand,
        RebuildLatestCacheCommand,
        OperationSightingCliService,
    ],
})
export class OperationSightingCliModule {}
