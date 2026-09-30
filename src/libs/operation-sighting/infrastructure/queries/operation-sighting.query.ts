import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray, mergeWith } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
import { Between, In, Repository } from 'typeorm';
import { FormationModel } from 'src/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/libs/operation/infrastructure/models/operation.model';
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

    /**
     * findOneLatestByOperationNumberAndBeforeSightingTime の複数版（時刻断面をまとめて返す口用）。
     * 運用番号ごとの最新の有効な目撃を 1 回の問い合わせ（DISTINCT ON）で取る。キーは運用番号。
     */
    async findManyLatestByOperationNumbersAndBeforeSightingTime(params: {
        operationNumbers: string[];
        sightingTime: dayjs.Dayjs;
    }): Promise<Map<string, OperationSightingDetailsDto>> {
        return this.#findManyLatestBeforeSightingTime(
            'operation.operationNumber',
            params.operationNumbers,
            params.sightingTime,
            (model) => model.operation?.operationNumber,
        );
    }

    /** findOneLatestByFormationNumberAndBeforeSightingTime の複数版。キーは編成番号。 */
    async findManyLatestByFormationNumbersAndBeforeSightingTime(params: {
        formationNumbers: string[];
        sightingTime: dayjs.Dayjs;
    }): Promise<Map<string, OperationSightingDetailsDto>> {
        return this.#findManyLatestBeforeSightingTime(
            'formation.formationNumber',
            params.formationNumbers,
            params.sightingTime,
            (model) => model.formation?.formationNumber,
        );
    }

    /**
     * 番号ごとに「その時刻以前の最新の有効な目撃」を 1 回の問い合わせで引く。
     * 1 件ずつの口と同じ「時刻の降順に 1 件」を LATERAL で番号ごとに回すので、
     * (operation_id|formation_id, sighting_time) の索引がそのまま効く（DISTINCT ON だと全履歴を読む）。
     */
    async #findManyLatestBeforeSightingTime(
        keyColumn: 'operation.operationNumber' | 'formation.formationNumber',
        keys: string[],
        sightingTime: dayjs.Dayjs,
        keyOf: (model: OperationSightingModel) => string | undefined,
    ): Promise<Map<string, OperationSightingDetailsDto>> {
        const result = new Map<string, OperationSightingDetailsDto>();
        if (keys.length === 0) return result;

        const connection = this.operationSightingRepository.manager.connection;
        const sightings = this.operationSightingRepository.metadata.tableName;
        const invalidations = connection.getMetadata(OperationSightingInvalidationModel).tableName;
        const [joinTable, joinColumn, numberColumn] =
            keyColumn === 'operation.operationNumber'
                ? [connection.getMetadata(OperationModel).tableName, 'operation_id', 'operation_number']
                : [connection.getMetadata(FormationModel).tableName, 'formation_id', 'formation_number'];

        const rows: { id: string }[] = await this.operationSightingRepository.query(
            `SELECT latest.id
               FROM unnest($1::text[]) AS k(key)
               CROSS JOIN LATERAL (
                   SELECT s.id
                     FROM "${sightings}" s
                     JOIN "${joinTable}" j ON j.id = s.${joinColumn}
                    WHERE j.${numberColumn} = k.key
                      AND s.sighting_time <= $2
                      AND NOT EXISTS (
                          SELECT 1 FROM "${invalidations}" inv WHERE inv.operation_sighting_id = s.id
                      )
                    ORDER BY s.sighting_time DESC, s.updated_at DESC
                    LIMIT 1
               ) latest`,
            [keys, sightingTime.toISOString()],
        );
        if (rows.length === 0) return result;

        const models = await this.operationSightingRepository.find({
            where: { id: In(rows.map((row) => row.id)) },
            relations: ['operation', 'formation'],
        });
        for (const model of models) {
            const key = keyOf(model);
            if (key !== undefined && !result.has(key)) {
                result.set(key, OperationSightingDtoBuilder.buildFromModel(model));
            }
        }
        return result;
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
