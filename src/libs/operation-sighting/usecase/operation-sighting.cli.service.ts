import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain.js';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';

@Injectable()
export class OperationSightingCliService {
    readonly #logger = new Logger(OperationSightingCliService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly operationSightingLatestCacheCommand: OperationSightingLatestCacheCommand,
    ) {}

    async rebuildLatestCache(): Promise<void> {
        // 表を lock してから消して入れ直す。投稿側の書き込みはこの間待つ
        const count = await this.dataSource.transaction(async (manager) => {
            await manager.query(
                'LOCK TABLE operation_sighting_latest_caches IN SHARE ROW EXCLUSIVE MODE',
            );
            await this.operationSightingLatestCacheCommand.removeAll(manager);

            const sightings =
                await this.operationSightingQuery.findManyLatestPerFormation(
                    manager,
                );
            const caches = sightings.map((sighting) =>
                OperationSightingLatestCache.create({
                    operationSightingId: sighting.operationSightingId,
                    operationNumber: sighting.operation!.operationNumber,
                    formationNumber: sighting.formation!.formationNumber,
                }),
            );
            await this.operationSightingLatestCacheCommand.bulkSave(
                caches,
                manager,
            );
            return caches.length;
        });

        this.#logger.log(`Rebuilt ${count} cache entries.`);
    }
}
