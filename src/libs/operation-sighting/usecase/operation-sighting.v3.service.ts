import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import dayjs from 'dayjs';
import clone from 'just-clone';
import pick from 'just-pick';
import { getBaseDate } from 'src/core/utils/datetime';
import { FormationQuery } from 'src/libs/formation/infrastructure/queries/formation.query';
import { OperationQuery } from 'src/libs/operation/infrastructure/queries/operation.query';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';
import { CalendarQuery } from 'src/libs/calendar/infrastructure/queries/calendar.query';

@Injectable()
export class OperationSightingV3Service {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly calendarQuery: CalendarQuery,
        private readonly operationQuery: OperationQuery,
        private readonly formationQuery: FormationQuery,
    ) {}

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
    }): Promise<OperationSightingDetailsDto[]> {
        const { start, end, includeInvalidated = false } = params;

        return this.operationSightingQuery.findManyBySpecificPeriod({
            start,
            end,
            includeInvalidated,
        });
    }

    async findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        searchTime?: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { operationNumber, searchTime } = params;

        // 休車の場合は422エラーを返す
        if (operationNumber === '100') {
            throw new UnprocessableEntityException(
                'Searching for suspended operation is not supported.',
            );
        }

        // 運用番号から最新の目撃情報を取得する
        const latestSighting =
            await this.operationSightingQuery.findOneLatestByOperationNumber({
                operationNumber,
            });

        // 最新の目撃情報が存在しなかった場合は、最新の目撃情報と期待される目撃情報の両方がnullのDTOを返す
        if (!latestSighting) {
            return {
                latestSighting: null,
                expectedSighting: null,
            };
        }

        // 検索日時から1日ずつ遡り、現在推測される目撃情報を取得する
        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const latestSightingTimeInstance = dayjs(latestSighting.sightingTime);

        const diffDays = getBaseDate(searchTimeInstance).diff(
            getBaseDate(latestSightingTimeInstance),
            'day',
        );

        let expectedSighting: OperationSightingTimeCrossSectionDto['expectedSighting'] =
            clone(latestSighting);
        let targetOperationNumber = operationNumber;

        for (let i = 0; i <= diffDays; i++) {
            // 運用番号を逆送りする
            if (i > 0) {
                targetOperationNumber = operationNumberCirculateReverseMap.get(
                    targetOperationNumber,
                );
            }

            // 逆送り先の運用番号が存在しない場合、期待される目撃情報はnullとする
            if (!targetOperationNumber) {
                expectedSighting = null;
                break;
            }

            // 逆送り先の運用番号で目撃情報を検索する
            const sightingTimeStart = getBaseDate(searchTimeInstance)
                .subtract(i, 'day')
                .hour(4);
            const sightingTimeEnd = sightingTimeStart.add(1, 'day');

            const targetSighting =
                await this.operationSightingQuery.findOneLatestByOperationNumberAndSightingTimeRange(
                    {
                        operationNumber: targetOperationNumber,
                        sightingTimeStart,
                        sightingTimeEnd,
                    },
                );

            // 逆送り先の運用番号で目撃情報が存在し、編成番号が異なる場合、期待される目撃情報のIDと編成番号を更新する
            if (
                targetSighting &&
                targetSighting.formation.formationNumber !==
                    expectedSighting.formation.formationNumber
            ) {
                expectedSighting.id = targetSighting.id;
                expectedSighting.formation.formationNumber =
                    targetSighting.formation.formationNumber;
                break;
            }
        }

        if (expectedSighting) {
            // 期待される目撃情報の編成番号で、最新の目撃情報を再取得する
            const sightingTimeStart = getBaseDate(searchTimeInstance).hour(4);
            const sightingTimeEnd = sightingTimeStart.add(1, 'day');

            const targetSighting =
                await this.operationSightingQuery.findOneLatestByFormationNumberAndSightingTimeRange(
                    {
                        formationNumber:
                            expectedSighting.formation.formationNumber,
                        sightingTimeStart,
                        sightingTimeEnd,
                    },
                );

            // 期待される目撃情報の編成番号で最新の目撃情報が存在していて、期待される目撃情報のIDと異なる場合、期待される目撃情報はnullとする
            if (targetSighting && targetSighting.id !== expectedSighting.id) {
                expectedSighting = null;
            }
        }

        // 検索日時時点で有効な編成情報を取得する
        const startDate = getBaseDate(searchTimeInstance).format('YYYY-MM-DD');
        const endDate = startDate;

        const formations = await this.formationQuery.findManyBySpecificPeriod({
            startDate,
            endDate,
        });

        expectedSighting = {
            ...pick(latestSighting, ['operation']),
            formation:
                expectedSighting &&
                (formations.find(
                    (f) =>
                        f.formationNumber ===
                        expectedSighting.formation.formationNumber,
                ) ??
                    null),
        };

        return {
            latestSighting,
            expectedSighting,
        };
    }

    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, searchTime } = params;

        // 編成番号から最新の目撃情報を取得する
        const latestSighting =
            await this.operationSightingQuery.findOneLatestByFormationNumber({
                formationNumber,
            });

        // 最新の目撃情報が存在しなかった場合は、最新の目撃情報と期待される目撃情報の両方がnullのDTOを返す
        if (!latestSighting) {
            return {
                latestSighting: null,
                expectedSighting: null,
            };
        }

        // 最新の目撃情報が休車の場合は、期待される目撃情報を休車のまま返す
        if (latestSighting.operation.operationNumber === '100') {
            return {
                latestSighting,
                expectedSighting: {
                    ...pick(latestSighting, ['formation']),
                    operation: pick(latestSighting.operation, [
                        'operationNumber',
                    ]),
                },
            };
        }

        // 最新の目撃時刻から1日ずつ進み、現在推測される目撃情報を取得する
        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const latestSightingTimeInstance = dayjs(latestSighting.sightingTime);

        const diffDays = getBaseDate(searchTimeInstance).diff(
            getBaseDate(latestSightingTimeInstance),
            'day',
        );

        let expectedSighting: OperationSightingTimeCrossSectionDto['expectedSighting'] =
            clone(latestSighting);
        let targetOperationNumber = latestSighting.operation.operationNumber;

        for (let i = 0; i <= diffDays; i++) {
            // 運用番号を順送りする
            if (i > 0) {
                targetOperationNumber = operationNumberCirculateMap.get(
                    targetOperationNumber,
                );
            }

            // 順送り先の運用番号が存在しない場合、期待される目撃情報はnullとする
            if (!targetOperationNumber) {
                expectedSighting = null;
                break;
            }

            // 順送り先の運用番号で目撃情報を検索する
            const sightingTimeStart = getBaseDate(latestSightingTimeInstance)
                .add(i, 'day')
                .hour(4);
            const sightingTimeEnd = sightingTimeStart.add(1, 'day');

            const targetSighting =
                await this.operationSightingQuery.findOneLatestByOperationNumberAndSightingTimeRange(
                    {
                        operationNumber: targetOperationNumber,
                        sightingTimeStart,
                        sightingTimeEnd,
                    },
                );

            // 順送り先の運用番号で目撃情報が存在し、編成番号が異なる場合、期待される目撃情報はnullとする
            if (
                targetSighting &&
                targetSighting.formation.formationNumber !==
                    expectedSighting.formation.formationNumber
            ) {
                expectedSighting = null;
                break;
            }

            // 期待される目撃情報の運用番号を更新する
            expectedSighting.operation.operationNumber = targetOperationNumber;
        }

        if (expectedSighting) {
            // 期待される目撃情報の運用番号で、最新の目撃情報を再取得する
            const sightingTimeStart = getBaseDate(searchTimeInstance).hour(4);
            const sightingTimeEnd = sightingTimeStart.add(1, 'day');

            const targetSighting =
                await this.operationSightingQuery.findOneLatestByOperationNumberAndSightingTimeRange(
                    {
                        operationNumber:
                            expectedSighting.operation.operationNumber,
                        sightingTimeStart,
                        sightingTimeEnd,
                    },
                );

            // 期待される目撃情報の運用番号で最新の目撃情報が存在していて、期待される目撃情報のIDと異なる場合、期待される目撃情報はnullとする
            if (targetSighting && targetSighting.id !== expectedSighting.id) {
                expectedSighting = null;
            }
        }

        // 検索日時時点で有効な運用情報を取得する
        const date = getBaseDate(searchTimeInstance).format('YYYY-MM-DD');

        const calendar = await this.calendarQuery.findOneBySpecificDate({
            date,
        });

        const operations = await this.operationQuery.findManyByCalendarId({
            calendarId: calendar.id,
        });

        expectedSighting = {
            ...pick(latestSighting, ['formation']),
            operation:
                expectedSighting &&
                (operations.find(
                    (o) =>
                        o.operationNumber ===
                        expectedSighting.operation.operationNumber,
                ) ??
                    null),
        };

        return {
            latestSighting,
            expectedSighting,
        };
    }

    async invalidate(
        params: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new NotFoundException(
                `OperationSighting with id ${operationSightingId} not found.`,
            );
        }

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

        domain.invalidate(userId, reason);

        const result = await this.operationSightingCommand.save(domain);

        return result;
    }

    async restore(
        params: RestoreOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new NotFoundException(
                `OperationSighting with id ${operationSightingId} not found.`,
            );
        }

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

        domain.restore(userId, reason);

        const result = await this.operationSightingCommand.save(domain);

        return result;
    }
}

const operationNumberCirculateMap = new Map([
    // 1群
    ['11', '12'],
    ['12', '13'],
    ['13', '14'],
    ['14', '15'],
    ['15', '11'],
    // 5群
    ['51', '52'],
    ['52', '53'],
    ['53', '54'],
    ['54', '55'],
    ['55', '56'],
    ['56', '57'],
    ['57', '58'],
    ['58', '59'],
    ['59', '51'],
    // 6群
    ['61', '62'],
    ['62', '63'],
    ['63', '64'],
    ['64', '65'],
    ['65', '66'],
    ['66', '67'],
    ['67', '68'],
    ['68', '69'],
    ['69', '61'],
    // 7群
    ['70', '71'],
    ['71', '72'],
    ['72', '73'],
    ['73', '70'],
    // 9G群
    ['91G', '92G'],
    ['92G', '93G'],
    ['94G', '95G'],
    ['95G', '91G'],
    // 休車
    ['100', '100'],
]);
const operationNumberCirculateReverseMap = new Map([
    ...Array.from(operationNumberCirculateMap.entries()).map(
        (arr) => arr.reverse() as [string, string],
    ),
]);
