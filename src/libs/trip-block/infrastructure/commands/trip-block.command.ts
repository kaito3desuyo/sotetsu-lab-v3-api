import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { Repository } from 'typeorm';
import { TripBlocks } from '../../domain/trip-block.domain';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder';
import { TripBlocksModelBuilder } from '../builders/trip-block.model.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockCommand extends TypeOrmCrudService<TripBlockModel> {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {
        super(tripBlockRepository);
    }

    async createManyTripBlocks(
        query: CrudRequest,
        domains: TripBlocks,
    ): Promise<TripBlockDetailsDto[]> {
        const models = TripBlocksModelBuilder.buildFromDomain(domains);
        const result = await this.createMany(query, { bulk: models });
        return TripBlocksDtoBuilder.buildFromModel(result);
    }

    async createEmptyTripBlock(): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository.save({});
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async deleteTripBlockById(tripBlockId: string): Promise<void> {
        await this.tripBlockRepository.delete(tripBlockId);
    }
}
