import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SparseFieldsets } from '../../../../core/utils/sparse-fieldsets.js';
import { FindManyOptions, Repository } from 'typeorm';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto.js';
import { TripBlockSparseDto } from '../../usecase/dtos/trip-block-sparse.dto.js';
import { TripBlockSparseDtoBuilder } from '../builders/trip-block-sparse.dto.builder.js';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder.js';
import { TripBlockModel } from '../models/trip-block.model.js';

@Injectable()
export class TripBlockQuery {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {}

    async findMany(
        options?: FindManyOptions<TripBlockModel>,
    ): Promise<TripBlockDetailsDto[]> {
        const models = await this.tripBlockRepository.find(options);
        return TripBlocksDtoBuilder.buildFromModel(models);
    }

    // async findOne(): Promise<TripBlockDetailsDto> {
    //     const model = await this.tripBlockRepository.findOne();
    //     return TripBlockDtoBuilder.buildFromModel(model);
    // }

    // =========================================================================

    async findOneTripBlockByTripBlockId(
        tripBlockId: string,
    ): Promise<TripBlockDetailsDto | null> {
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .where('tripBlock.id = :tripBlockId', { tripBlockId })
            .getOne();
        if (!model) return null;
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findOneTripBlockByTripId(
        tripId: string,
    ): Promise<TripBlockDetailsDto | null> {
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            // 読み込む側の trips で絞ると block の列車がこの 1 本だけになるので、別名で絞る
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.id = :tripId',
                {
                    tripId,
                },
            )
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .getOne();
        if (!model) return null;
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
    }): Promise<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection } = params;
        const models = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
                { calendarId, tripDirection },
            )
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .leftJoinAndSelect('tripOperationLists.operation', 'operation')
            .leftJoinAndSelect('trips.tripClass', 'tripClass')
            .orderBy('times.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('times.departureTime', 'ASC', 'NULLS LAST')
            .getMany();
        return TripBlocksDtoBuilder.buildFromModel(models);
    }

    /**
     * `findManyByFilter` と同じ条件で、`fields` で指定した資源・列だけを返す
     * （docs/adr/0002-v3-sparse-fieldsets.md）。指定の無い関連は結合しない。
     * 関連を組み立てるため、結合した資源の主キーは常に選ぶ（応答には指定したときだけ出す）。
     */
    async findManyByFilterWithFields(
        params: { calendarId: string; tripDirection: number },
        fieldsets: SparseFieldsets,
    ): Promise<TripBlockSparseDto[]> {
        const { calendarId, tripDirection } = params;
        const columns = (alias: string, resource: string): string[] => [
            `${alias}.id`,
            ...[...(fieldsets.get(resource) ?? [])]
                .filter((field) => field !== 'id')
                .map((field) => `${alias}.${field}`),
        ];

        const qb = this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select(['tripBlock.id'])
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
                { calendarId, tripDirection },
            )
            .leftJoin('tripBlock.trips', 'trips')
            .addSelect(columns('trips', 'trip'));

        if (fieldsets.has('time')) {
            qb.leftJoin('trips.times', 'times').addSelect(
                columns('times', 'time'),
            );
        }
        if (fieldsets.has('tripOperationList')) {
            qb.leftJoin(
                'trips.tripOperationLists',
                'tripOperationLists',
            ).addSelect(columns('tripOperationLists', 'tripOperationList'));
        }
        if (fieldsets.has('operation')) {
            qb.leftJoin('tripOperationLists.operation', 'operation').addSelect(
                columns('operation', 'operation'),
            );
        }
        if (fieldsets.has('tripClass')) {
            qb.leftJoin('trips.tripClass', 'tripClass').addSelect(
                columns('tripClass', 'tripClass'),
            );
        }
        if (fieldsets.has('time')) {
            qb.orderBy('times.departureDays', 'ASC', 'NULLS LAST').addOrderBy(
                'times.departureTime',
                'ASC',
                'NULLS LAST',
            );
        }

        const models = await qb.getMany();
        return TripBlockSparseDtoBuilder.buildFromModel(models, fieldsets);
    }

    async findOneById(params: {
        id: string;
    }): Promise<TripBlockDetailsDto | null> {
        const { id } = params;
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .leftJoinAndSelect('tripOperationLists.operation', 'operation')
            .leftJoinAndSelect('trips.tripClass', 'tripClass')
            .where('tripBlock.id = :id', { id })
            .orderBy('times.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('times.departureTime', 'ASC', 'NULLS LAST')
            .getOne();
        if (!model) return null;
        return TripBlockDtoBuilder.buildFromModel(model);
    }
}
