import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { Repository, QueryRunner, FindManyOptions } from 'typeorm';

@Injectable()
export class NewOperationSightingService {
  constructor(
    @InjectRepository(OperationSighting)
    private readonly operationSightingRepository: Repository<OperationSighting>,
  ) {}

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.operationSightingRepository.createQueryBuilder(
      alias,
      queryRunner,
    );
  }

  findAll(options?: FindManyOptions): Promise<OperationSighting[]> {
    return this.operationSightingRepository.find(options);
  }

  async getOperationSightingsLatestGroupByOperations(): Promise<
    OperationSighting[]
  > {
    const subQuery = this.createQueryBuilder('t_sightings')
      .select('"t_sightings".operation_id')
      .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
      .groupBy('operation_id');

    const latestSightings = await this.createQueryBuilder('t_updates')
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

    const latestSightingsDetail = await this.findAll({
      where: latestSightings.map(data => {
        return {
          operation_id: data.operation_id,
          sighting_time: data.latest_sighting,
          updated_at: data.latest_update,
        };
      }),
      relations: ['operation', 'formation'],
      order: {
        sighting_time: 'DESC',
      },
    });

    return latestSightingsDetail;
  }

  async getOperationSightingsLatestGroupByFormations(): Promise<
    OperationSighting[]
  > {
    const subQuery = this.createQueryBuilder('t_sightings')
      .select('"t_sightings".formation_id')
      .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
      .groupBy('formation_id');

    const latestSightings = await this.createQueryBuilder('t_updates')
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

    const latestSightingsDetail = await this.findAll({
      where: latestSightings.map(data => {
        return {
          formation_id: data.formation_id,
          sighting_time: data.latest_sighting,
          updated_at: data.latest_update,
        };
      }),
      relations: ['operation', 'formation'],
      order: {
        sighting_time: 'DESC',
      },
    });

    return latestSightingsDetail;
  }
}