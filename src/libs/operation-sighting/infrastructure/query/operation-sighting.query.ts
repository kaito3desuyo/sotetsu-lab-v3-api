import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import dayjs from 'dayjs';
import { isArray, mergeWith } from 'lodash';
import moment, { Moment } from 'moment';
import { crudReqMergeCustomizer } from 'src/core/util/merge-customizer';
import { Repository } from 'typeorm';
import { OperationSighting } from '../../../../main/v1/operation/operation-sighting.entity';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { buildOperationSightingDetailsDto } from '../builders/operation-sighting-dto.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

export class OperationSightingQuery extends TypeOrmCrudService<OperationSightingModel> {
    constructor(
        @InjectRepository(OperationSighting)
        private readonly operationSightingRepo: Repository<OperationSighting>,
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

    async findOneOperationSighting(
        query: CrudRequest,
    ): Promise<OperationSightingDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildOperationSightingDetailsDto(model);
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
        const latestOperationSightingIds = await this.operationSightingRepository.find(
            {
                select: ['id'],
                where: latestOperationSightingTimes.map((data) => {
                    return {
                        operationId: data.operation_id,
                        sightingTime: data.latest_sighting_time,
                        updatedAt: data.latest_update_time,
                    };
                }),
            },
        );

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
        const latestOperationSightingIds = await this.operationSightingRepository.find(
            {
                select: ['id'],
                where: latestOperationSightingTimes.map((data) => {
                    return {
                        formationId: data.formation_id,
                        sightingTime: data.latest_sighting_time,
                        updatedAt: data.latest_update_time,
                    };
                }),
            },
        );

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

    async findLatestBySightingTimeGroupByOperation(time?: Moment) {
        const searchTime = time ? time : moment();

        const subQuery = this.operationSightingRepo
            .createQueryBuilder('t_sightings')
            .select('"t_sightings".operation_id')
            .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
            .where(
                `"t_sightings".sighting_time <= '${searchTime.toISOString()}'`,
            )
            .groupBy('operation_id');

        const latestSightings = await this.operationSightingRepo
            .createQueryBuilder('t_updates')
            .select('"t_updates".operation_id')
            .addSelect('jointable.latest_sighting')
            .addSelect('MAX("t_updates".updated_at)', 'latest_update')
            .innerJoin(
                '(' + subQuery.getQuery() + ')',
                'jointable',
                '"t_updates".operation_id = jointable.operation_id AND "t_updates".sighting_time = jointable.latest_sighting',
            )
            .groupBy('"t_updates".operation_id')
            .addGroupBy('"jointable".latest_sighting')
            .getRawMany();

        const latestSightingsDetail = await this.operationSightingRepo.find({
            where: latestSightings.map((data) => {
                return {
                    operation_id: data.operation_id,
                    sighting_time: data.latest_sighting,
                    updated_at: data.latest_update,
                };
            }),
            relations: ['operation', 'formation'],
        });

        return latestSightingsDetail;
    }

    async findLatestBySightingTimeGroupByFormation(time?: Moment) {
        const searchTime = time ? time : moment();

        const subQuery = this.operationSightingRepo
            .createQueryBuilder('t_sightings')
            .select('"t_sightings".formation_id')
            .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
            .where(
                `"t_sightings".sighting_time <= '${searchTime.toISOString()}'`,
            )
            .groupBy('formation_id');

        const latestSightings = await this.operationSightingRepo
            .createQueryBuilder('t_updates')
            .select('"t_updates".formation_id')
            .addSelect('jointable.latest_sighting')
            .addSelect('MAX("t_updates".updated_at)', 'latest_update')
            .innerJoin(
                '(' + subQuery.getQuery() + ')',
                'jointable',
                '"t_updates".formation_id = jointable.formation_id AND "t_updates".sighting_time = jointable.latest_sighting',
            )
            .groupBy('"t_updates".formation_id')
            .addGroupBy('"jointable".latest_sighting')
            .getRawMany();

        const latestSightingsDetail = await this.operationSightingRepo.find({
            where: latestSightings.map((data) => {
                return {
                    formation_id: data.formation_id,
                    sighting_time: data.latest_sighting,
                    updated_at: data.latest_update,
                };
            }),
            relations: ['operation', 'formation'],
        });

        return latestSightingsDetail;
    }
}
