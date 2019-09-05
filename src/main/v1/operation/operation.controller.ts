import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { Operation } from './operation.entity';
import { OperationService } from './operation.service';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import {
  In,
  Not,
  LessThanOrEqual,
  InsertResult,
  SelectQueryBuilder,
} from 'typeorm';
import { CalenderService } from '../calender/calender.service';

@Controller()
export class OperationController {
  constructor(
    private calenderService: CalenderService,
    private operationService: OperationService,
    private operationSightingService: OperationSightingService,
  ) {}

  @Get()
  async getOperations(): Promise<Operation[]> {
    const operations = await this.operationService.findAll();
    return operations;
  }

  @Get('/search')
  async searchOperations(@Query()
  query: {
    calender_id: string;
    operation_number: string;
  }): Promise<Operation[]> {
    try {
      const operations = await this.operationService.findAll({
        where: query,
      });

      return operations;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Get('/all/numbers')
  async getOperationsGroupByOperationNumber(): Promise<Operation[]> {
    const operations = await this.operationService
      .createQueryBuilder()
      .select('operation_number')
      .groupBy('operation_number')
      .where({
        operation_number: Not('100'),
      })
      .orderBy('operation_number', 'ASC')
      .getRawMany();

    return operations;
  }

  @Get('/all/trips')
  async getOperationsAllTrips(@Query() query: { calender_id: string }): Promise<
    Operation[]
  > {
    const qb = await this.operationService.createQueryBuilder('operation');
    let searchQuery = qb;
    if (query.calender_id !== undefined) {
      searchQuery = searchCalenderId(
        'operation',
        query.calender_id,
        searchQuery,
      );
    }
    const operationTrips = await searchQuery
      .leftJoinAndSelect('operation.trips', 'trips')
      .leftJoinAndSelect('trips.times', 'times')
      .andWhere('operation.operation_number != :number', { number: '100' })
      .orderBy('operation.operation_number', 'ASC')
      .addOrderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')
      .getMany();

    return operationTrips;
  }

  @Get('/search/numbers')
  async searchOperationNumbers(@Query()
  query: {
    calender_id: string;
  }): Promise<Array<{ operation_number: string }>> {
    const qb = await this.operationService.createQueryBuilder('operation');
    let searchQuery = qb;
    if (query.calender_id !== undefined) {
      searchQuery = searchCalenderId(
        'operation',
        query.calender_id,
        searchQuery,
      );
    }
    const operationNumbers = await searchQuery
      .select('operation_number')
      .andWhere('operation_number != :number', { number: '100' })
      .orderBy('operation_number', 'ASC')
      .getRawMany();

    return operationNumbers;
  }

  @Get('/all/latest-sightings/')
  async getOperationsAllLatestSightings(): Promise<any[]> {
    const subQuery = await this.operationSightingService
      .createQueryBuilder('t_sightings')
      .select('"t_sightings".operation_id')
      .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
      .groupBy('operation_id');

    const latestSightings = await this.operationSightingService
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

    const latestSightingsDetail = await this.operationSightingService.findAll({
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

  @Get('/by-calender/:calenderId/sightings')
  async getOperationsByCalenderIdSightings(
    @Param('calenderId') calenderId: string,
  ): Promise<Operation[]> {
    const calenders = await this.calenderService.findAll({
      where: {
        start_date: LessThanOrEqual('2019-08-13'),
        end_date: null,
      },
      order: {
        sunday: 'ASC',
      },
    });

    const calendersId = calenders.map(obj => obj.id);

    const operations = await this.operationService.findAll({
      where: {
        calender_id: In(calendersId),
        operation_number: Not('100'),
      },
      order: {
        operation_number: 'ASC',
      },
    });

    const operationIds = operations.map(obj => obj.id);

    const operationSightings = await this.operationSightingService.findAll({
      where: {
        operation_id: In(operationIds),
      },
      order: {
        sighting_time: 'DESC',
      },
      relations: ['formation'],
    });

    return operations.map(operation => {
      return {
        ...operation,
        operation_sightings: operationSightings.filter((sighting, index) => {
          if (index > 10) {
            return false;
          }
          return operation.id === sighting.operation_id;
        }),
      };
    });
  }

  @Get('/sightings')
  async getOperationSightings(): Promise<OperationSighting[]> {
    const sightings = await this.operationSightingService.findAll();
    return sightings;
  }

  @Post('/sightings')
  async addOperationSightings(@Body()
  body: {
    formation_id: string;
    operation_id: string;
    sighting_time: string;
  }): Promise<OperationSighting> {
    const sighting = await this.operationSightingService.save(body);
    return sighting;
  }
}

const searchCalenderId = (
  tableName: string,
  calenderId: string,
  qb: SelectQueryBuilder<any>,
) => {
  return qb.andWhere(`${tableName}.calender_id = :calenderId`, { calenderId });
};
