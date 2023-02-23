/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import dayjs from 'dayjs';
import { find, mergeWith, omit } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/util/merge-customizer';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationDetailsDto } from './dtos/operation-details.dto';

@Injectable()
export class OperationV2Service {
    constructor(private readonly operationQuery: OperationQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        OperationDetailsDto[] | GetManyDefaultResponse<OperationDetailsDto>
    > {
        return this.operationQuery.findManyOperations(query);
    }

    findOne(query: CrudRequest): Promise<OperationDetailsDto> {
        return this.operationQuery.findOneOperation(query);
    }

    findAllOperationNumbers(calendarId: string): Promise<string[]> {
        return this.operationQuery.findAllOperationNumbers(calendarId);
    }

    async findOneWithCurrentPosition(
        query: CrudRequest,
    ): Promise<{
        operation: OperationDetailsDto;
        position: {
            prev: TripOperationListDetailsDto;
            current: TripOperationListDetailsDto;
            next: TripOperationListDetailsDto;
        };
    }> {
        const dto = await this.operationQuery.findOneOperation(
            mergeWith(
                {
                    parsed: {
                        join: [
                            { field: 'tripOperationLists' },
                            { field: 'tripOperationLists.trip' },
                            { field: 'tripOperationLists.trip.tripClass' },
                            { field: 'tripOperationLists.startTime' },
                            // { field: 'tripOperationLists.startTime.station' },
                            { field: 'tripOperationLists.endTime' },
                            // { field: 'tripOperationLists.endTime.station' },
                        ],
                        sort: [
                            {
                                field:
                                    'tripOperationLists.startTime.departureDays',
                                order: 'ASC',
                            },
                            {
                                field:
                                    'tripOperationLists.startTime.departureTime',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.endTime.arrivalDays',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.endTime.arrivalTime',
                                order: 'ASC',
                            },
                        ],
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );

        const position = {
            prev: null,
            current: null,
            next: null,
        };

        if (!dto.tripOperationLists.length) {
            return {
                operation: omit(dto, 'tripOperationLists'),
                position,
            };
        }

        const now = dayjs();
        const today = dayjs().format('YYYY-MM-DD');
        const timeFormat = 'YYYY-MM-DD HH:mm:ss';

        /**
         * 0番目の列車の発車時刻よりも前の場合
         */
        if (
            now <
            dayjs(
                today + ' ' + dto.tripOperationLists[0].startTime.departureTime,
                timeFormat,
            )
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(
                    dto.tripOperationLists[0].startTime.departureDays - 1,
                    'days',
                )
        ) {
            position.next = dto.tripOperationLists[0];
            return {
                operation: omit(dto, 'tripOperationLists'),
                position,
            };
        }

        /**
         * 現在位置が列車間の場合
         */
        // n番目の列車の到着時刻 < 現時刻 <= n + 1番目の列車の出発時刻
        const nArrToNowToNPlus1Dep = find(
            dto.tripOperationLists,
            (_, index, array) => {
                if (!array[index + 1]) {
                    return undefined;
                }
                return (
                    dayjs(
                        today + ' ' + array[index].endTime.arrivalTime,
                        timeFormat,
                    )
                        .subtract(now.hour() < 4 ? 1 : 0, 'days')
                        .add(array[index].endTime.arrivalDays - 1, 'days') <=
                        now &&
                    now <
                        dayjs(
                            today +
                                ' ' +
                                array[index + 1].startTime.departureTime,
                            timeFormat,
                        )
                            .subtract(now.hour() < 4 ? 1 : 0, 'days')
                            .add(
                                array[index + 1].startTime.departureDays - 1,
                                'days',
                            )
                );
            },
        );

        // n - 1番目の列車の到着時刻 < 現時刻 <= n番目の列車の出発時刻
        const nMinus1ToNowToNDep = find(
            dto.tripOperationLists,
            (_, index, array) => {
                if (!array[index - 1]) {
                    return undefined;
                }
                return (
                    dayjs(
                        today + ' ' + array[index - 1].endTime.arrivalTime,
                        timeFormat,
                    )
                        .subtract(now.hour() < 4 ? 1 : 0, 'days')
                        .add(
                            array[index - 1].endTime.arrivalDays - 1,
                            'days',
                        ) <= now &&
                    now <
                        dayjs(
                            today + ' ' + array[index].startTime.departureTime,
                            timeFormat,
                        )
                            .subtract(now.hour() < 4 ? 1 : 0, 'days')
                            .add(
                                array[index].startTime.departureDays - 1,
                                'days',
                            )
                );
            },
        );

        if (nArrToNowToNPlus1Dep && nMinus1ToNowToNDep) {
            position.prev = nArrToNowToNPlus1Dep;
            position.next = nMinus1ToNowToNDep;
            return {
                operation: omit(dto, 'tripOperationLists'),
                position,
            };
        }

        /**
         * 現在走行中の列車
         */
        const currentRunning = find(
            dto.tripOperationLists,
            (tripOperationList) => {
                return (
                    dayjs(
                        today + ' ' + tripOperationList.startTime.departureTime,
                        timeFormat,
                    )
                        .subtract(now.hour() < 4 ? 1 : 0, 'days')
                        .add(
                            tripOperationList.startTime.departureDays - 1,
                            'days',
                        ) <= now &&
                    now <
                        dayjs(
                            today + ' ' + tripOperationList.endTime.arrivalTime,
                            timeFormat,
                        )
                            .subtract(now.hour() < 4 ? 1 : 0, 'days')
                            .add(
                                tripOperationList.endTime.arrivalDays - 1,
                                'days',
                            )
                );
            },
        );

        if (currentRunning) {
            position.current = currentRunning;
            return {
                operation: omit(dto, 'tripOperationLists'),
                position,
            };
        }

        /**
         * 最後の列車の到着時刻よりも現時刻が大きい場合
         */
        if (
            dayjs(
                today +
                    ' ' +
                    dto.tripOperationLists[dto.tripOperationLists.length - 1]
                        .endTime.arrivalTime,
                timeFormat,
            )
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(
                    dto.tripOperationLists[dto.tripOperationLists.length - 1]
                        .endTime.arrivalDays - 1,
                    'days',
                ) <= now
        ) {
            position.prev =
                dto.tripOperationLists[dto.tripOperationLists.length - 1];
            return {
                operation: omit(dto, 'tripOperationLists'),
                position,
            };
        }

        return {
            operation: omit(dto, 'tripOperationLists'),
            position,
        };
    }

    async findOneWithTrips(
        query: CrudRequest,
    ): Promise<{
        operation: OperationDetailsDto;
        trips: TripOperationListDetailsDto[];
    }> {
        const dto = await this.operationQuery.findOneOperation(
            mergeWith(
                {
                    parsed: {
                        join: [
                            { field: 'tripOperationLists' },
                            { field: 'tripOperationLists.trip' },
                            // { field: 'tripOperationLists.trip.times' },
                            { field: 'tripOperationLists.trip.tripClass' },
                            { field: 'tripOperationLists.startTime' },
                            { field: 'tripOperationLists.endTime' },
                        ],
                        sort: [
                            {
                                field:
                                    'tripOperationLists.startTime.departureDays',
                                order: 'ASC',
                            },
                            {
                                field:
                                    'tripOperationLists.startTime.departureTime',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.endTime.arrivalDays',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.endTime.arrivalTime',
                                order: 'ASC',
                            },
                            // {
                            //     field:
                            //         'tripOperationLists.trip.times.stopSequence',
                            //     order: 'ASC',
                            // },
                        ],
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );

        return {
            operation: omit(dto, 'tripOperationLists'),
            trips: dto.tripOperationLists,
        };
    }
}
