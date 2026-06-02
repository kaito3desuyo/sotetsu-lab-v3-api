import { Injectable, Logger } from '@nestjs/common';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';

@Injectable()
export class OperationSightingCliService {
    readonly #logger = new Logger(OperationSightingCliService.name);

    constructor(
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly operationSightingLatestCacheCommand: OperationSightingLatestCacheCommand,
    ) {}

    async rebuildLatestCache(): Promise<void> {
        const sightings =
            await this.operationSightingQuery.findManyLatestPerFormation();

        const caches = sightings.map((sighting) =>
            OperationSightingLatestCache.create({
                operationSightingId: sighting.operationSightingId,
                operationNumber: sighting.operation!.operationNumber,
                formationNumber: sighting.formation!.formationNumber,
            }),
        );
        await this.operationSightingLatestCacheCommand.bulkSave(caches);

        this.#logger.log(`Rebuilt ${sightings.length} cache entries.`);
    }
}
