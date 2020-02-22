import { IOperationSightingQuery } from '../../application-service/query/i-operation-sighting.query';
import { InjectRepository } from '@nestjs/typeorm';
import { OperationSighting } from '../../../../main/v1/operation/operation-sighting.entity';
import { Repository } from 'typeorm';
import moment, { Moment } from 'moment';

export class OperationSightingQuery implements IOperationSightingQuery {
    constructor(
        @InjectRepository(OperationSighting)
        private readonly operationSightingRepo: Repository<OperationSighting>,
    ) {}

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
            where: latestSightings.map(data => {
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
            where: latestSightings.map(data => {
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
