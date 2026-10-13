import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { secondsOfServiceDay } from 'src/core/utils/datetime';
import { Repository } from 'typeorm';
import { ItinerarySegment } from '../../domain/itinerary-link-rule.domain';

/** 行程表の材料（カレンダーの運用の区間すべて）を 1 回の問い合わせで引く */
@Injectable()
export class ItinerarySegmentQuery {
    constructor(
        @InjectRepository(TripOperationListModel)
        private readonly tripOperationListRepository: Repository<TripOperationListModel>,
    ) {}

    async findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<ItinerarySegment[]> {
        const rows = await this.tripOperationListRepository
            .createQueryBuilder('tol')
            .select('tol.id', 'id')
            .addSelect('tol.tripId', 'tripId')
            .addSelect('trip.tripBlockId', 'tripBlockId')
            .addSelect('tol.operationId', 'operationId')
            .addSelect('operation.operationNumber', 'operationNumber')
            .addSelect('tol.startStationId', 'startStationId')
            .addSelect('tol.endStationId', 'endStationId')
            .addSelect('startTime.departureDays', 'departureDays')
            .addSelect('startTime.departureTime', 'departureTime')
            .addSelect('endTime.arrivalDays', 'arrivalDays')
            .addSelect('endTime.arrivalTime', 'arrivalTime')
            .addSelect('tol.nextTripOperationListId', 'nextTripOperationListId')
            .innerJoin('tol.trip', 'trip')
            .innerJoin('tol.operation', 'operation')
            .innerJoin('tol.startTime', 'startTime')
            .innerJoin('tol.endTime', 'endTime')
            .where('operation.calendarId = :calendarId', {
                calendarId: params.calendarId,
            })
            .getRawMany();

        return rows.flatMap((r) => {
            const startSeconds = secondsOfServiceDay(
                r.departureDays,
                r.departureTime,
            );
            const endSeconds = secondsOfServiceDay(
                r.arrivalDays,
                r.arrivalTime,
            );
            if (startSeconds === null || endSeconds === null) return [];
            return [
                {
                    id: r.id,
                    tripId: r.tripId,
                    tripBlockId: r.tripBlockId,
                    operationId: r.operationId,
                    operationNumber: r.operationNumber,
                    startStationId: r.startStationId,
                    endStationId: r.endStationId,
                    startSeconds,
                    endSeconds,
                    nextTripOperationListId: r.nextTripOperationListId ?? null,
                },
            ];
        });
    }
}
