import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { Repository } from 'typeorm';
import { OperationSighting } from '../../domain/operation-sighting.domain';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting-dto.builder';
import { OperationSightingModelBuilder } from '../builders/operation-sighting.model.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable()
export class OperationSightingCommand extends TypeOrmCrudService<OperationSightingModel> {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
    ) {
        super(operationSightingRepository);
    }

    async createOneOperationSighting(
        query: CrudRequest,
        domain: OperationSighting,
    ): Promise<OperationSightingDetailsDto> {
        const model = OperationSightingModelBuilder.buildFromDomain(domain);
        const result = await this.createOne(query, model);
        return OperationSightingDtoBuilder.buildFromModel(result);
    }
}
