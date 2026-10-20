import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSighting } from '../../domain/operation-sighting.domain';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting.dto.builder';
import { OperationSightingModelBuilder } from '../builders/operation-sighting.model.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

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
