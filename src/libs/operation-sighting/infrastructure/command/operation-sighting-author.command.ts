import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSightingAuthorModel } from '../models/operation-sighting-author.model.js';

@Injectable()
export class OperationSightingAuthorCommand {
    constructor(
        @InjectRepository(OperationSightingAuthorModel)
        private readonly repository: Repository<OperationSightingAuthorModel>,
    ) {}

    async create(
        params: { operationSightingId: string; userId: string },
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingAuthorModel)
            : this.repository;
        await repo.insert({
            operationSightingId: params.operationSightingId,
            userId: params.userId,
        });
    }
}
