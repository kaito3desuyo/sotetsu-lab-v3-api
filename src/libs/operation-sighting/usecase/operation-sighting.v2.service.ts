import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import dayjs from 'dayjs';
import { cloneDeep, pick } from 'lodash';
import { getBaseDate } from 'src/core/utils/datetime';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { CreateOperationSightingDto } from './dtos/create-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';

@Injectable()
export class OperationSightingV2Service {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingQuery: OperationSightingQuery,
    ) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyOperationSightings(query);
    }

    findManyLatestGroupByOperation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyLatestOperationSightingsGroupByOperation(
            query,
        );
    }

    findManyLatestGroupByFormation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyLatestOperationSightingsGroupByFormation(
            query,
        );
    }

    findOne(query: CrudRequest): Promise<OperationSightingDetailsDto> {
        return this.operationSightingQuery.findOneOperationSighting(query);
    }

    async findOneTimeCrossSectionFromOperationNumber(params: {
        operationNumber: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { operationNumber } = params;

        if (operationNumber === '100') {
            throw new UnprocessableEntityException(
                'Searching for suspended trains is not supported.',
            );
        }

        const latestSighting: OperationSightingTimeCrossSectionDto['latestSighting'] =
            await this.operationSightingQuery.findOneLatestOperationSightingFromOperationNumber(
                { operationNumber },
            );

        if (!latestSighting) {
            throw new NotFoundException(
                'Latest `OperationSighting` is not found.',
            );
        }

        let targetOperationNumber = operationNumber;
        let expectedSighting: OperationSightingTimeCrossSectionDto['expectedSighting'] =
            cloneDeep(latestSighting);

        const searchTime = dayjs();
        const latestSightingTime = dayjs(latestSighting.sightingTime);

        const diffDays = getBaseDate(searchTime).diff(
            getBaseDate(latestSightingTime),
            'days',
        );

        for (let i = 1; i <= diffDays; i++) {
            targetOperationNumber = operationNumberCirculateReverseMap.get(
                targetOperationNumber,
            );
            if (!targetOperationNumber) break;

            const sightingTimeStart = searchTime
                .subtract(i, 'days')
                .hour(4)
                .minute(0)
                .second(0)
                .millisecond(0);
            const sightingTimeEnd = sightingTimeStart.add(24, 'hours');

            const targetOperationSighting =
                await this.operationSightingQuery.findOneLatestOperationSightingFromOperationNumberAndSightingTimeRange(
                    {
                        operationNumber: targetOperationNumber,
                        sightingTimeStart,
                        sightingTimeEnd,
                    },
                );

            if (targetOperationSighting) {
                expectedSighting.operation.operationNumber =
                    targetOperationSighting.operation.operationNumber;
                expectedSighting.formation.formationNumber =
                    targetOperationSighting.formation.formationNumber;
                break;
            }
        }

        const sightingTimeStart = latestSightingTime;
        const sightingTimeEnd = searchTime
            .add(1, 'days')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0);

        const newerFormationSighting =
            await this.operationSightingQuery.findOneLatestOperationSightingFromFormationNumberAndSightingTimeRange(
                {
                    formationNumber: expectedSighting.formation.formationNumber,
                    sightingTimeStart,
                    sightingTimeEnd,
                },
            );

        if (
            newerFormationSighting &&
            newerFormationSighting.operation.operationNumber !==
                expectedSighting.operation.operationNumber
        ) {
            expectedSighting = null;
        }

        expectedSighting = expectedSighting && {
            ...pick(latestSighting, ['operation']),
            formation: pick(expectedSighting.formation, ['formationNumber']),
        };

        return {
            latestSighting,
            expectedSighting,
        };
    }

    async createOne(
        query: CrudRequest,
        dto: CreateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const domain = OperationSightingDomainBuilder.buildByCreateDto(dto);
        const result =
            await this.operationSightingCommand.createOneOperationSighting(
            query,
            domain,
        );
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
]);
const operationNumberCirculateReverseMap = new Map([
    ...Array.from(operationNumberCirculateMap.entries()).map(
        (arr) => arr.reverse() as [string, string],
    ),
]);
