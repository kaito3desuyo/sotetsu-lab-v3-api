import { Injectable } from '@nestjs/common';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import _, { find, some, get, groupBy, flatMap } from 'lodash';
import moment, { Moment } from 'moment';
import { OperationService } from '../../../libs/operation/application-service/operation.service';
import { OperationSighting } from '../../../main/v1/operation/operation-sighting.entity';

@Injectable()
export class OperationSightingService {
    constructor(
        private operationService: OperationService,
        private operationSightingQuery: OperationSightingQuery,
    ) {}

    findBySightingTimeGroupByOperation() {
        return this.operationSightingQuery.findLatestBySightingTimeGroupByOperation();
    }

    async findLatestBySightingTime(calendarId: string, time?: Moment) {
        const isExistNewerSighting = (
            target: OperationSighting,
            all: OperationSighting[],
            path: string,
        ) => {
            return some(all, (o) => {
                return (
                    get(target, path) === get(o, path) &&
                    (moment(target.sighting_time) < moment(o.sighting_time) ||
                        (moment(target.sighting_time).isSame(o.sighting_time) &&
                            moment(target.updated_at) < moment(o.updated_at)))
                );
            });
        };

        const circulateOperationNumber = (target: string, days: number) => {
            const operationNumber = Number(target);
            let added = operationNumber;
            for (let i = 0; i < days; i++) {
                switch (String(added).slice(0, 1)) {
                    case '1':
                        added = added + 1;
                        if (String(added).slice(-1) === '6') {
                            added = added - 5;
                        }
                        break;
                    case '2':
                        added = added + 1;
                        if (String(added).slice(-1) === '5') {
                            added = added - 4;
                        }
                        break;
                    case '7':
                        added = added + 1;
                        if (String(added).slice(-1) === '5') {
                            added = added - 4;
                        }
                        break;
                    case '8':
                    case '9':
                        return null;
                    /*
            switch (added) {
              case 91:
                return '86';
              case 92:
                return '84';
              case 93:
                return '82';
              case 94:
                return '83';
              case 95:
                return '81';
              case 96:
                return '85';
            }
            break;
            */
                    default:
                        added = added + 1;
                        if (String(added).slice(-1) === '0') {
                            added = added - 9;
                        }
                }
            }
            return String(added);
        };

        const calcDayDifference = (timestamp: Date | string) => {
            return moment()
                .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                .hour(0)
                .minute(0)
                .second(0)
                .millisecond(0)
                .diff(
                    moment(timestamp)
                        .subtract(moment(timestamp).hour() < 4 ? 1 : 0, 'days')
                        .hour(0)
                        .minute(0)
                        .second(0)
                        .millisecond(0),
                    'days',
                );
        };

        const [
            groupByOperation,
            groupByFormation,
            todaysOperations,
        ] = await Promise.all([
            this.operationSightingQuery.findLatestBySightingTimeGroupByOperation(
                time,
            ),
            this.operationSightingQuery.findLatestBySightingTimeGroupByFormation(
                time,
            ),
            this.operationService.findByCalendarId(calendarId),
        ]);

        const data = _([...groupByOperation, ...groupByFormation])
            .uniqBy((o) => o.id)
            .sortBy([(o) => o.sighting_time, (o) => o.updated_at])
            .reverse()
            .map((o) => {
                const currentOperationNumber = o.operation
                    ? o.operation.operation_number
                    : null;
                const circulatedOperationNumber =
                    currentOperationNumber !== '100' &&
                    currentOperationNumber !== null
                        ? circulateOperationNumber(
                              currentOperationNumber,
                              calcDayDifference(o.sighting_time),
                          )
                        : currentOperationNumber;
                const circulatedOperation = circulatedOperationNumber
                    ? find(
                          todaysOperations,
                          (so) =>
                              so.operation_number === circulatedOperationNumber,
                      ) || null
                    : null;

                return {
                    ...o,
                    circulated_operation_id: circulatedOperation
                        ? circulatedOperation.id
                        : null,
                    circulated_operation: circulatedOperation,
                };
            })
            .map((o, index, arr) => {
                const isExistNewerSightingStatus: boolean =
                    isExistNewerSighting(
                        o,
                        arr as OperationSighting[],
                        'formation.formation_number',
                    ) ||
                    isExistNewerSighting(
                        o,
                        arr as OperationSighting[],
                        'circulated_operation.operation_number',
                    );

                return {
                    ...o,
                    circulated_operation_id:
                        o.operation &&
                        o.operation.operation_number !== '100' &&
                        isExistNewerSightingStatus
                            ? null
                            : o.circulated_operation_id,
                    circulated_operation:
                        o.operation &&
                        o.operation.operation_number !== '100' &&
                        isExistNewerSightingStatus
                            ? null
                            : o.circulated_operation,
                };
            })
            .value();

        const [
            groupByFormationResult,
            groupByOperationResult,
        ] = await Promise.all([
            new Promise((resolve) => {
                // 編成別
                const formationGrouped = groupBy(
                    data,
                    (o) => o.formation.formation_number,
                );
                const formationFlatted: OperationSighting[] = flatMap(
                    formationGrouped,
                    (value, key) => {
                        return value[0];
                    },
                );
                resolve(formationFlatted);
            }),
            new Promise((resolve) => {
                // 運用別
                const operationGrouped = groupBy(data, (o) =>
                    o.circulated_operation
                        ? o.circulated_operation.operation_number
                        : null,
                );
                const operationFlatted: OperationSighting[] = flatMap(
                    operationGrouped,
                    (value, key) => {
                        return value[0];
                    },
                );
                resolve(operationFlatted);
            }),
        ]);

        return {
            group_by_formations: groupByFormationResult,
            group_by_operations: groupByOperationResult,
        };
    }
}
