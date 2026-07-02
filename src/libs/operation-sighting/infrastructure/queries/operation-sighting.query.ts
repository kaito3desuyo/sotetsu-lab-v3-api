import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray, mergeWith } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
import { Between, Repository } from 'typeorm';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import {
    OperationSightingDtoBuilder,
    OperationSightingsDtoBuilder,
} from '../builders/operation-sighting.dto.builder';
import { OperationSightingInvalidationModel } from '../models/operation-sighting-invalidation.model';
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
            return OperationSightingsDtoBuilder.buildFromModel(models);
        } else {
            const data = OperationSightingsDtoBuilder.buildFromModel(models.data);
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
            return OperationSightingsDtoBuilder.buildFromModel(models);
        } else {
            const data = OperationSightingsDtoBuilder.buildFromModel(models.data);
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
            return OperationSightingsDtoBuilder.buildFromModel(models);
        } else {
            const data = OperationSightingsDtoBuilder.buildFromModel(models.data);
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

        let qb = this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.invalidations', 'invalidations')
            .leftJoinAndSelect('sighting.managementLogs', 'managementLogs')
            .where('sighting.sightingTime BETWEEN :start AND :end', {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            })
            .orderBy('sighting.sightingTime', 'ASC');

        if (!includeInvalidated) {
            qb = qb.andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            });
        }

        const model = await qb.getMany();

        return OperationSightingsDtoBuilder.buildFromModel(model);
    }

    async findOneOperationSighting(
        query: CrudRequest,
    ): Promise<OperationSightingDetailsDto | null> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return OperationSightingDtoBuilder.buildFromModel(model);
    }

    async findOneById(params: {
        id: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const model = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.invalidations', 'invalidations')
            .leftJoinAndSelect('sighting.managementLogs', 'managementLogs')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')
            .where('sighting.id = :id', { id: params.id })
            .getOne();

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

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByOperationNumber(params: {
        operationNumber: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByOperationNumberAndBeforeSightingTime(params: {
        operationNumber: string;
        sightingTime: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber, sightingTime } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere('sighting.sightingTime <= :sightingTime', {
                sightingTime: sightingTime.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

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

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByOperationNumberAndSightingTimeRange(params: {
        operationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere('sighting.sightingTime BETWEEN :start AND :end', {
                start: sightingTimeStart.toISOString(),
                end: sightingTimeEnd.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

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

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumber(params: {
        formationNumber: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumberAndBeforeSightingTime(params: {
        formationNumber: string;
        sightingTime: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber, sightingTime } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere('sighting.sightingTime <= :sightingTime', {
                sightingTime: sightingTime.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

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

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumberAndSightingTimeRange(params: {
        formationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere('sighting.sightingTime BETWEEN :start AND :end', {
                start: sightingTimeStart.toISOString(),
                end: sightingTimeEnd.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findManyLatestPerFormation(): Promise<OperationSightingDetailsDto[]> {
        const models = await this.operationSightingRepository
            .createQueryBuilder('s')
            .distinctOn(['"formation"."formation_number"'])
            .innerJoinAndSelect('s.operation', 'operation')
            .innerJoinAndSelect('s.formation', 'formation')
            .where((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = s.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('"formation"."formation_number"')
            .addOrderBy('"s"."sighting_time"', 'DESC')
            .addOrderBy('"s"."updated_at"', 'DESC')
            .getMany();

        return OperationSightingsDtoBuilder.buildFromModel(models);
    }
}
