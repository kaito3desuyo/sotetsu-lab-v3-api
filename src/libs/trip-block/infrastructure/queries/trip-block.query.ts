import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { FindManyOptions, Repository } from 'typeorm';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto.js';
import { TRIP_BLOCK_SELECTION_TREE } from '../../usecase/trip-block-selection.js';
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
     * `findManyByFilter` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。選ばれない関連は結合しない。
     * 関連を組み立てるため、結合した資源の主キーは常に選ぶ（応答には指定したときだけ出す）。
     */
    async findManyByFilterWithSelection(
        params: { calendarId: string; tripDirection: number },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId, tripDirection } = params;
        const tree = TRIP_BLOCK_SELECTION_TREE;
        const trips = tree.relations.trips;

        const qb = this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select(selectColumns('tripBlock', tree, selection))
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
                { calendarId, tripDirection },
            )
            .leftJoin('tripBlock.trips', 'trips')
            .addSelect(selectColumns('trips', trips, selection));

        if (selection.paths.has('trips.times')) {
            qb.leftJoin('trips.times', 'times').addSelect(
                selectColumns('times', trips.relations.times, selection),
            );
        }
        if (selection.paths.has('trips.tripOperationLists')) {
            qb.leftJoin(
                'trips.tripOperationLists',
                'tripOperationLists',
            ).addSelect(
                selectColumns(
                    'tripOperationLists',
                    trips.relations.tripOperationLists,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.tripOperationLists.operation')) {
            qb.leftJoin('tripOperationLists.operation', 'operation').addSelect(
                selectColumns(
                    'operation',
                    trips.relations.tripOperationLists.relations.operation,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.tripClass')) {
            qb.leftJoin('trips.tripClass', 'tripClass').addSelect(
                selectColumns(
                    'tripClass',
                    trips.relations.tripClass,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.times')) {
            qb.orderBy('times.departureDays', 'ASC', 'NULLS LAST').addOrderBy(
                'times.departureTime',
                'ASC',
                'NULLS LAST',
            );
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
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
