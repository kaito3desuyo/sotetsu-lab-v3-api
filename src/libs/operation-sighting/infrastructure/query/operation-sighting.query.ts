import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray, mergeWith } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
import { Between, IsNull, Repository } from 'typeorm';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import {
    buildOperationSightingDetailsDto,
    OperationSightingDtoBuilder,
} from '../builders/operation-sighting-dto.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable()
export class OperationSightingQuery extends TypeOrmCrudService<OperationSightingModel> {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
    ) {
        super(operationSightingRepository);
    }

    async findManyOperationSightings(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildOperationSightingDetailsDto(o));
        } else {
            const data = models.data.map((o) =>
                buildOperationSightingDetailsDto(o),
            );
            return {
                ...models,
                data,
            };
        }
    }

    async findManyLatestOperationSightingsGroupByOperation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        const searchTime = dayjs();

        const subQb = this.operationSightingRepository
            .createQueryBuilder('LatestSightings')
            .select('"LatestSightings"."operation_id"')
            .addSelect(
                'MAX("LatestSightings"."sighting_time")',
                'latest_sighting_time',
            )
            .where('"LatestSightings"."sighting_time" <= :searchTime')
            .groupBy('"LatestSightings"."operation_id"');

        const mainQb = this.operationSightingRepository
            .createQueryBuilder('LatestUpdates')
            .select('"LatestUpdates"."operation_id"')
            .addSelect('"LatestSightings"."latest_sighting_time"')
            .addSelect(
                'MAX("LatestUpdates"."updated_at")',
                'latest_update_time',
            )
            .innerJoin(
                '(' + subQb.getQuery() + ')',
                'LatestSightings',
                '"LatestUpdates"."operation_id" = "LatestSightings"."operation_id" AND "LatestUpdates"."sighting_time" = "LatestSightings"."latest_sighting_time"',
                {
                    searchTime: searchTime.toISOString(),
                },
            )
            .groupBy('"LatestUpdates"."operation_id"')
            .addGroupBy('"LatestSightings"."latest_sighting_time"');

        const latestOperationSightingTimes = await mainQb.getRawMany();
        const latestOperationSightingIds =
            await this.operationSightingRepository.find({
                select: ['id'],
                where: latestOperationSightingTimes.map((data) => {
                    return {
                        operationId: data.operation_id,
                        sightingTime: data.latest_sighting_time,
                        updatedAt: data.latest_update_time,
                    };
                }),
            });

        const models = await this.getMany(
            mergeWith(
                {
                    parsed: {
                        search: {
                            $and: [
                                {
                                    id: {
                                        $in: latestOperationSightingIds.map(
                                            (o) => o.id,
                                        ),
                                    },
                                },
                            ],
                        },
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );

        if (isArray(models)) {
            return models.map((o) => buildOperationSightingDetailsDto(o));
        } else {
            const data = models.data.map((o) =>
                buildOperationSightingDetailsDto(o),
            );
            return {
                ...models,
                data,
            };
        }
    }

    async findManyLatestOperationSightingsGroupByFormation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        const searchTime = dayjs();

        const subQb = this.operationSightingRepository
            .createQueryBuilder('LatestSightings')
            .select('"LatestSightings"."formation_id"')
            .addSelect(
                'MAX("LatestSightings"."sighting_time")',
                'latest_sighting_time',
            )
            .where('"LatestSightings"."sighting_time" <= :searchTime')
            .groupBy('"LatestSightings"."formation_id"');

        const mainQb = this.operationSightingRepository
            .createQueryBuilder('LatestUpdates')
            .select('"LatestUpdates"."formation_id"')
            .addSelect('"LatestSightings"."latest_sighting_time"')
            .addSelect(
                'MAX("LatestUpdates"."updated_at")',
                'latest_update_time',
            )
            .innerJoin(
                '(' + subQb.getQuery() + ')',
                'LatestSightings',
                '"LatestUpdates"."formation_id" = "LatestSightings"."formation_id" AND "LatestUpdates"."sighting_time" = "LatestSightings"."latest_sighting_time"',
                {
                    searchTime: searchTime.toISOString(),
                },
            )
            .groupBy('"LatestUpdates"."formation_id"')
            .addGroupBy('"LatestSightings"."latest_sighting_time"');

        const latestOperationSightingTimes = await mainQb.getRawMany();
        const latestOperationSightingIds =
            await this.operationSightingRepository.find({
                select: ['id'],
                where: latestOperationSightingTimes.map((data) => {
                    return {
                        formationId: data.formation_id,
                        sightingTime: data.latest_sighting_time,
                        updatedAt: data.latest_update_time,
                    };
                }),
            });

        const models = await this.getMany(
            mergeWith(
                {
                    parsed: {
                        search: {
                            $and: [
                                {
                                    id: {
                                        $in: latestOperationSightingIds.map(
                                            (o) => o.id,
                                        ),
                                    },
                                },
                            ],
                        },
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );

        if (isArray(models)) {
            return models.map((o) => buildOperationSightingDetailsDto(o));
        } else {
            const data = models.data.map((o) =>
                buildOperationSightingDetailsDto(o),
            );
            return {
                ...models,
                data,
            };
        }
    }

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
    }): Promise<OperationSightingDetailsDto[]> {
        const { start, end, includeInvalidated = false } = params;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format)
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0);
        const endDate = dayjs(end, format)
            .add(1, 'day')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0);

        const model = await this.operationSightingRepository.find({
            relations: ['invalidations', 'managementLogs'],
            where: {
                sightingTime: Between(startDate.toDate(), endDate.toDate()),
                invalidations: includeInvalidated
                    ? undefined
                    : { id: IsNull() },
            },
            order: {
                sightingTime: 'ASC',
            },
        });

        return model.map((o) => OperationSightingDtoBuilder.buildFromModel(o));
    }

    async findOneOperationSighting(
        query: CrudRequest,
    ): Promise<OperationSightingDetailsDto | null> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildOperationSightingDetailsDto(model);
    }

    async findOneById(params: {
        id: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const model = await this.operationSightingRepository.findOne({
            where: { id: params.id },
            relations: ['invalidations', 'managementLogs'],
        });

        if (!model) {
            return null;
        }

        return OperationSightingDtoBuilder.buildFromModel(model);
    }

    async findOneLatestOperationSightingFromOperationNumber(params: {
        operationNumber: string;
    }): Promise<OperationSightingDetailsDto> {
        const { operationNumber } = params;

        const result = await this.findOne({
            relations: ['operation', 'formation'],
            where: {
                operation: {
                    operationNumber,
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return buildOperationSightingDetailsDto(result);
    }

    async findOneLatestByOperationNumber(params: {
        operationNumber: string;
    }): Promise<OperationSightingDetailsDto> {
        const { operationNumber } = params;

        const result = await this.operationSightingRepository.findOne({
            relations: ['operation', 'formation', 'invalidations'],
            where: {
                operation: {
                    operationNumber,
                },
                invalidations: {
                    id: IsNull(),
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestOperationSightingFromOperationNumberAndSightingTimeRange(params: {
        operationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto> {
        const { operationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.findOne({
            relations: ['operation', 'formation'],
            where: {
                operation: {
                    operationNumber,
                },
                sightingTime: Between(
                    sightingTimeStart.toISOString() as unknown as Date,
                    sightingTimeEnd.toISOString() as unknown as Date,
                ),
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return buildOperationSightingDetailsDto(result);
    }

    async findOneLatestByOperationNumberAndSightingTimeRange(params: {
        operationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto> {
        const { operationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository.findOne({
            relations: ['operation', 'formation', 'invalidations'],
            where: {
                operation: {
                    operationNumber,
                },
                sightingTime: Between(
                    sightingTimeStart.toISOString() as unknown as Date,
                    sightingTimeEnd.toISOString() as unknown as Date,
                ),
                invalidations: {
                    id: IsNull(),
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestOperationSightingFromFormationNumber(params: {
        formationNumber: string;
    }): Promise<OperationSightingDetailsDto> {
        const { formationNumber } = params;

        const result = await this.findOne({
            relations: ['operation', 'formation'],
            where: {
                formation: {
                    formationNumber,
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return buildOperationSightingDetailsDto(result);
    }

    async findOneLatestByFormationNumber(params: {
        formationNumber: string;
    }): Promise<OperationSightingDetailsDto> {
        const { formationNumber } = params;

        const result = await this.operationSightingRepository.findOne({
            relations: ['operation', 'formation', 'invalidations'],
            where: {
                formation: {
                    formationNumber,
                },
                invalidations: {
                    id: IsNull(),
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestOperationSightingFromFormationNumberAndSightingTimeRange(params: {
        formationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto> {
        const { formationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.findOne({
            relations: ['operation', 'formation'],
            where: {
                formation: {
                    formationNumber,
                },
                sightingTime: Between(
                    sightingTimeStart.toISOString() as unknown as Date,
                    sightingTimeEnd.toISOString() as unknown as Date,
                ),
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return buildOperationSightingDetailsDto(result);
    }

    async findOneLatestByFormationNumberAndSightingTimeRange(params: {
        formationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto> {
        const { formationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository.findOne({
            relations: ['operation', 'formation', 'invalidations'],
            where: {
                formation: {
                    formationNumber,
                },
                sightingTime: Between(
                    sightingTimeStart.toISOString() as unknown as Date,
                    sightingTimeEnd.toISOString() as unknown as Date,
                ),
                invalidations: {
                    id: IsNull(),
                },
            },
            order: {
                sightingTime: 'DESC',
                updatedAt: 'DESC',
            },
        });

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }
}
