import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSightingLatestCache } from '../../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheModelBuilder } from '../builders/operation-sighting-latest-cache.model.builder';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

@Injectable()
export class OperationSightingLatestCacheCommand {
    constructor(
        @InjectRepository(OperationSightingLatestCacheModel)
        private readonly repository: Repository<OperationSightingLatestCacheModel>,
    ) {}

    async save(
        domain: OperationSightingLatestCache,
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingLatestCacheModel)
            : this.repository;
        await repo.save(
            OperationSightingLatestCacheModelBuilder.buildFromDomain(domain),
        );
    }

    async bulkSave(
        domains: OperationSightingLatestCache[],
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingLatestCacheModel)
            : this.repository;
        await repo.save(
            OperationSightingLatestCacheModelBuilder.buildFromDomains(domains),
        );
    }

    async remove(
        domain: OperationSightingLatestCache,
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingLatestCacheModel)
            : this.repository;
        await repo.remove(
            OperationSightingLatestCacheModelBuilder.buildFromDomain(domain),
        );
    }
}
