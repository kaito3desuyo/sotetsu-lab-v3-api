import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSighting } from '../../domain/operation-sighting.domain.js';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto.js';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting.dto.builder.js';
import { OperationSightingModelBuilder } from '../builders/operation-sighting.model.builder.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';

@Injectable()
export class OperationSightingCommand {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
    ) {}

    async save(
        domain: OperationSighting,
        manager?: EntityManager,
    ): Promise<OperationSightingDetailsDto> {
        const repo = manager
            ? manager.getRepository(OperationSightingModel)
            : this.operationSightingRepository;
        const model = OperationSightingModelBuilder.buildFromDomain(domain);
        const result = await repo.save(model);
        return OperationSightingDtoBuilder.buildFromModel(result);
    }
}
