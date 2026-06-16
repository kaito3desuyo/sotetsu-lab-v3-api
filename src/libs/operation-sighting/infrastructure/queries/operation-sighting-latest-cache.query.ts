import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { OperationSightingLatestCacheDto } from '../../usecase/dtos/operation-sighting-latest-cache.dto';
import {
    OperationSightingLatestCacheDtoBuilder,
    OperationSightingLatestCachesDtoBuilder,
} from '../builders/operation-sighting-latest-cache.dto.builder';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

@Injectable()
export class OperationSightingLatestCacheQuery {
    constructor(
        @InjectRepository(OperationSightingLatestCacheModel)
        private readonly repository: Repository<OperationSightingLatestCacheModel>,
    ) {}

    async findOneByFormationNumber(params: {
        formationNumber: string;
    }): Promise<OperationSightingLatestCacheDto | null> {
        const { formationNumber } = params;

        const model = await this.repository
            .createQueryBuilder('cache')
            .innerJoinAndSelect('cache.operationSighting', 'sighting')
            .where('cache.formationNumber = :formationNumber', { formationNumber })
            .getOne();

        return model
            ? OperationSightingLatestCacheDtoBuilder.buildFromModel(model)
            : null;
    }

    async findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange(params: {
        operationNumbers: string[];
        startTime: dayjs.Dayjs;
        endTime: dayjs.Dayjs;
    }): Promise<OperationSightingLatestCacheDto[]> {
        const { operationNumbers, startTime, endTime } = params;
        if (operationNumbers.length === 0) return [];

        const models = await this.repository
            .createQueryBuilder('cache')
            .innerJoinAndSelect('cache.operationSighting', 'sighting')
            .where('cache.operationNumber IN (:...operationNumbers)', { operationNumbers })
            .andWhere('sighting.sightingTime >= :startTime', { startTime: startTime.toDate() })
            .andWhere('sighting.sightingTime <= :endTime', { endTime: endTime.toDate() })
            .getMany();

        return OperationSightingLatestCachesDtoBuilder.buildFromModel(models);
    }
}
