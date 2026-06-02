import { Command, CommandRunner, SubCommand } from 'nest-commander';
import { OperationSightingCliService } from '../usecase/operation-sighting.cli.service';

@SubCommand({
    name: 'rebuild-latest-cache',
    description: 'Rebuild operation_sighting_latest_caches from operation_sightings',
})
export class RebuildLatestCacheCommand extends CommandRunner {
    constructor(
        private readonly operationSightingCliService: OperationSightingCliService,
    ) {
        super();
    }

    async run(): Promise<void> {
        await this.operationSightingCliService.rebuildLatestCache();
    }
}

@Command({
    name: 'operation-sighting',
    description: 'Operation Sighting',
    subCommands: [RebuildLatestCacheCommand],
})
export class OperationSightingCliCommand extends CommandRunner {
    async run(): Promise<void> {
        console.error('error: please use sub commands.');
        process.exitCode = 1;
    }
}
