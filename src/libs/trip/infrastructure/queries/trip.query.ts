import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto.js';
import {
    TripDtoBuilder,
    TripsDtoBuilder,
} from '../builders/trip.dto.builder.js';
import { TRIPS_BY_STATION_SELECTION_TREE } from '../../usecase/trips-by-station-selection.js';
import { TripModel } from '../models/trip.model.js';

/** その駅に停まる時刻（乗り降りできるか、時刻のある通過扱いでない停車） */
const STOPS_AT_STATION =
    'stationTime.stationId = :stationId AND (stationTime.pickupType = 0 OR stationTime.dropoffType = 0 OR (stationTime.pickupType = 1 AND stationTime.dropoffType = 1 AND (stationTime.departureTime IS NOT NULL OR stationTime.arrivalTime IS NOT NULL)))';

@Injectable()
export class TripQuery {
    constructor(
        @InjectRepository(TripModel)
        private readonly tripRepository: Repository<TripModel>,
    ) {}

    async findOneTripById(tripId: string): Promise<TripDetailsDto | null> {
        const model = await this.tripRepository.findOne({
            where: { id: tripId },
        });
        if (!model) return null;
        return TripDtoBuilder.buildFromModel(model);
    }

    async findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
    }): Promise<TripDetailsDto[]> {
        const { stationId, calendarId, tripDirection } = params;

        const models = await this.tripRepository
            .createQueryBuilder('trip')
            .select('trip')
            .innerJoin('trip.times', 'stationTime', STOPS_AT_STATION, {
                stationId,
            })
            .leftJoinAndSelect('trip.times', 'times')
            .leftJoinAndSelect('trip.tripOperationLists', 'tripOperationLists')
            .where('trip.calendarId = :calendarId', { calendarId })
            .andWhere('trip.tripDirection = :tripDirection', { tripDirection })
            .orderBy('stationTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.arrivalTime', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureTime', 'ASC', 'NULLS LAST')
            .getMany();

        return TripsDtoBuilder.buildFromModel(models);
    }

    /**
     * `findManyByStationId` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。駅の時刻での絞り込みと並べ替えは常にする。
     */
    async findManyByStationIdWithSelection(
        params: {
            stationId: string;
            calendarId: string;
            tripDirection: number;
        },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { stationId, calendarId, tripDirection } = params;
        const tree = TRIPS_BY_STATION_SELECTION_TREE;

        const qb = this.tripRepository
            .createQueryBuilder('trip')
            .select(selectColumns('trip', tree, selection))
            .innerJoin('trip.times', 'stationTime', STOPS_AT_STATION, {
                stationId,
            });

        if (selection.paths.has('times')) {
            qb.leftJoin('trip.times', 'times').addSelect(
                selectColumns('times', tree.relations.times, selection),
            );
        }
        if (selection.paths.has('tripOperationLists')) {
            qb.leftJoin(
                'trip.tripOperationLists',
                'tripOperationLists',
            ).addSelect(
                selectColumns(
                    'tripOperationLists',
                    tree.relations.tripOperationLists,
                    selection,
                ),
            );
        }

        const models = await qb
            .where('trip.calendarId = :calendarId', { calendarId })
            .andWhere('trip.tripDirection = :tripDirection', { tripDirection })
            .orderBy('stationTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.arrivalTime', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureTime', 'ASC', 'NULLS LAST')
            .getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }

    async countTripByTripBlockId(tripBlockId: string): Promise<number> {
        const count = await this.tripRepository.count({
            where: {
                tripBlockId,
            },
        });
        return count;
    }
}
