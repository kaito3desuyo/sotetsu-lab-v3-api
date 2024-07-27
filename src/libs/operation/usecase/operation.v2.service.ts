/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import dayjs from 'dayjs';
import omit from 'just-omit';
import { mergeWith } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
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

    async findOneWithCurrentPosition(query: CrudRequest): Promise<{
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
                                field: 'tripOperationLists.startTime.departureDays',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.startTime.departureTime',
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
                operation: omit(dto, ['tripOperationLists']),
                position,
            };
        }

        const now = dayjs();
        const today = now.format('YYYY-MM-DD');
        const target = (days: number, time: string) =>
            dayjs(`${today} ${time}`, 'YYYY-MM-DD HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(days - 1, 'days');

        /**
         * 0番目の列車の発車時刻よりも前の場合
         */
        if (
            now <
            target(
                dto.tripOperationLists.at(0).startTime.departureDays,
                dto.tripOperationLists.at(0).startTime.departureTime,
            )
        ) {
            position.next = dto.tripOperationLists.at(0);
            return {
                operation: omit(dto, ['tripOperationLists']),
                position,
            };
        }

        /**
         * 現在位置が列車間の場合
         */
        // n番目の列車の到着時刻 < 現時刻 <= n + 1番目の列車の出発時刻
        const nArrToNowToNPlus1Dep = dto.tripOperationLists.find(
            (_, index, array) => {
                if (!array.at(index + 1)) {
                    return undefined;
                }

                return (
                    target(
                        array.at(index).endTime.arrivalDays,
                        array.at(index).endTime.arrivalTime,
                    ) <= now &&
                    now <
                        target(
                            array.at(index + 1).startTime.departureDays,
                            array.at(index + 1).startTime.departureTime,
                        )
                );
            },
        );

        // n - 1番目の列車の到着時刻 < 現時刻 <= n番目の列車の出発時刻
        const nMinus1ToNowToNDep = dto.tripOperationLists.find(
            (_, index, array) => {
                if (!array.at(index - 1)) {
                    return undefined;
                }

                return (
                    target(
                        array.at(index - 1).endTime.arrivalDays,
                        array.at(index - 1).endTime.arrivalTime,
                    ) <= now &&
                    now <
                        target(
                            array.at(index).startTime.departureDays,
                            array.at(index).startTime.departureTime,
                        )
                );
            },
        );

        if (nArrToNowToNPlus1Dep && nMinus1ToNowToNDep) {
            position.prev = nArrToNowToNPlus1Dep;
            position.next = nMinus1ToNowToNDep;
            return {
                operation: omit(dto, ['tripOperationLists']),
                position,
            };
        }

        /**
         * 現在走行中の列車
         */
        const currentRunning = dto.tripOperationLists.find(
            (tripOperationList) => {
                return (
                    target(
                        tripOperationList.startTime.departureDays,
                        tripOperationList.startTime.departureTime,
                    ) <= now &&
                    now <
                        target(
                            tripOperationList.endTime.arrivalDays,
                            tripOperationList.endTime.arrivalTime,
                        )
                );
            },
        );

        if (currentRunning) {
            position.current = currentRunning;
            return {
                operation: omit(dto, ['tripOperationLists']),
                position,
            };
        }

        /**
         * 最後の列車の到着時刻よりも現時刻が大きい場合
         */
        if (
            target(
                dto.tripOperationLists.at(-1).endTime.arrivalDays,
                dto.tripOperationLists.at(-1).endTime.arrivalTime,
            ) <= now
        ) {
            position.prev = dto.tripOperationLists.at(-1);
            return {
                operation: omit(dto, ['tripOperationLists']),
                position,
            };
        }

        return {
            operation: omit(dto, ['tripOperationLists']),
            position,
        };
    }

    async findOneWithTrips(query: CrudRequest): Promise<{
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
                                field: 'tripOperationLists.startTime.departureDays',
                                order: 'ASC',
                            },
                            {
                                field: 'tripOperationLists.startTime.departureTime',
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
