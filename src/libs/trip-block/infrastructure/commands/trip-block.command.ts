import { Injectable } from '@nestjs/common';
import { CrudRequest } from '@nestjsx/crud';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder';
import {
    TripBlockModelBuilder,
    TripBlocksModelBuilder,
} from '../builders/trip-block.model.builder';
import { TripBlockRepository } from '../repositories/trip-block.repository';
import { SaveOptions } from 'typeorm';

@Injectable()
export class TripBlockCommand {
    constructor(private readonly tripBlockRepository: TripBlockRepository) {}

    async bulkCreate(
        domains: TripBlocks,
        options?: SaveOptions,
    ): Promise<TripBlockDetailsDto[]> {
        const models = TripBlocksModelBuilder.buildFromDomain(domains);
        const result = await this.tripBlockRepository.save(models, options);
        return TripBlocksDtoBuilder.buildFromModel(result);
    }

    // =========================================================================

    async createManyTripBlocks(
        query: CrudRequest,
        domains: TripBlocks,
    ): Promise<TripBlockDetailsDto[]> {
        const models = TripBlocksModelBuilder.buildFromDomain(domains);
        const result = await this.tripBlockRepository.createMany(query, {
            bulk: models,
        });
        return TripBlocksDtoBuilder.buildFromModel(result);
    }

    async replaceOneTripBlock(
        query: CrudRequest,
        domain: TripBlock,
    ): Promise<TripBlockDetailsDto> {
        const model = TripBlockModelBuilder.buildFromDomain(domain);
        const result = await this.tripBlockRepository.replaceOne(query, model);
        return TripBlockDtoBuilder.buildFromModel(result);
    }

    async replaceOneTripBlockByDomain(
        domain: TripBlock,
    ): Promise<TripBlockDetailsDto> {
        const model = TripBlockModelBuilder.buildFromDomain(domain);
        const result = await this.tripBlockRepository.save(model);
        return TripBlockDtoBuilder.buildFromModel(result);
    }

    async deleteOneTripBlock(
        query: CrudRequest,
    ): Promise<void | TripBlockDetailsDto> {
        const result = await this.tripBlockRepository.deleteOne(query);
        return result && TripBlockDtoBuilder.buildFromModel(result);
    }

    async deleteOneTripBlockByDomain(
        domain: TripBlock,
    ): Promise<TripBlockDetailsDto> {
        const model = TripBlockModelBuilder.buildFromDomain(domain);
        const result = await this.tripBlockRepository.remove(model);
        return TripBlockDtoBuilder.buildFromModel(result);
    }
}
