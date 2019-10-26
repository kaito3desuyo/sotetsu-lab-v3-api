import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Operation } from './operation.entity';
import { OperationService } from './operation.service';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import { In, Not, LessThanOrEqual, SelectQueryBuilder } from 'typeorm';
import { CalendarService } from '../calendar/calendar.service';
import { AuthGuard } from './../../../shared/guards/auth.guard';
import moment from 'moment';
import { find } from 'lodash';
import { TripOperationList } from '../trip-operation-list/trip_operation_list.entity';

@Controller()
@UseGuards(AuthGuard)
export class OperationController {
  constructor(
    private calendarService: CalendarService,
    private operationService: OperationService,
    private operationSightingService: OperationSightingService,
  ) {}

  @Get()
  async getOperations(): Promise<{ operations: Operation[] }> {
    const operations = await this.operationService.findAll();
    return { operations };
  }

  @Get('/search')
  async searchOperations(@Query()
  query: {
    calendar_id?: string;
    operation_number?: string;
  }): Promise<{ operations: Operation[] }> {
    try {
      const whereObj = {};
      if (query.calendar_id) {
        // tslint:disable-next-line: no-string-literal
        whereObj['calendar_id'] = query.calendar_id;
      }
      if (query.operation_number) {
        // tslint:disable-next-line: no-string-literal
        whereObj['operation_number'] = query.operation_number;
      }

      const operations = await this.operationService.findAll({
        where: whereObj,
      });

      return { operations };
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Get('/search/current-position')
  async searchOperationsCurrentPosition(@Query()
  query: {
    calendar_id: string;
  }): Promise<{
    operations: Array<
      Pick<Operation, 'id' | 'operation_number'> & {
        current_position: {
          prev: TripOperationList;
          current: TripOperationList;
          next: TripOperationList;
        };
      }
    >;
  }> {
    const operations = await this.operationService
      .createQueryBuilder('operations')
      .andWhere('operations.operation_number != :number', { number: '100' })
      .andWhere('operations.calendar_id = :calendarId', {
        calendarId: query.calendar_id,
      })
      .leftJoinAndSelect(
        'operations.trip_operation_lists',
        'trip_operation_lists',
      )
      .leftJoinAndSelect('trip_operation_lists.start_time', 'start_time')
      .leftJoinAndSelect('trip_operation_lists.end_time', 'end_time')
      .leftJoinAndSelect('trip_operation_lists.trip', 'trip')
      .addOrderBy('operations.operation_number', 'ASC')
      .addOrderBy('start_time.departure_days', 'ASC')
      .addOrderBy('start_time.departure_time', 'ASC')
      .getMany();

    const now = moment();

    const currentPosition = operations.map(operation => {
      const base = {
        // ...operation,
        id: operation.id,
        operation_number: operation.operation_number,
        current_position: {
          prev: null,
          current: null,
          next: null,
        },
      };

      /**
       * 0番目の列車の発車時刻よりも前の場合
       */
      if (
        now <
        moment(
          operation.trip_operation_lists[0].start_time.departure_time,
          'HH:mm:ss',
        )
          .subtract(now.hour() < 4 ? 1 : 0, 'days')
          .add(
            operation.trip_operation_lists[0].start_time.departure_days - 1,
            'days',
          )
      ) {
        base.current_position.next = operation.trip_operation_lists[0];
        return base;
      }

      // n番目の列車の到着時刻 < 現時刻 <= n + 1番目の列車の出発時刻
      const nArrToNowToNPlus1Dep = find(
        operation.trip_operation_lists,
        (trip, index, array) => {
          if (!array[index + 1]) {
            return undefined;
          }
          return (
            moment(array[index].end_time.arrival_time, 'HH:mm:ss')
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(array[index].end_time.arrival_days - 1, 'days') <= now &&
            now <
              moment(array[index + 1].start_time.departure_time, 'HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(array[index + 1].start_time.departure_days - 1, 'days')
          );
        },
      );

      // n - 1番目の列車の到着時刻 < 現時刻 <= n番目の列車の出発時刻
      const nMinus1ToNowToNDep = find(
        operation.trip_operation_lists,
        (trip, index, array) => {
          if (!array[index - 1]) {
            return undefined;
          }
          return (
            moment(array[index - 1].end_time.arrival_time, 'HH:mm:ss')
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(array[index - 1].end_time.arrival_days - 1, 'days') <= now &&
            now <
              moment(array[index].start_time.departure_time, 'HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(array[index].start_time.departure_days - 1, 'days')
          );
        },
      );

      /**
       * 現在位置が列車間の場合
       */
      if (nArrToNowToNPlus1Dep && nMinus1ToNowToNDep) {
        base.current_position.prev = nArrToNowToNPlus1Dep;
        base.current_position.next = nMinus1ToNowToNDep;
        return base;
      }

      /**
       * 現在走行中の列車
       */
      const currentRunning = find(
        operation.trip_operation_lists,
        (tripOperationList, index, array) => {
          return (
            moment(tripOperationList.start_time.departure_time, 'HH:mm:ss')
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(tripOperationList.start_time.departure_days - 1, 'days') <=
              now &&
            now <
              moment(tripOperationList.end_time.arrival_time, 'HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(tripOperationList.end_time.arrival_days - 1, 'days')
          );
        },
      );

      if (currentRunning) {
        base.current_position.current = currentRunning;
        return base;
      }

      /**
       * 最後の列車の到着時刻よりも現時刻が大きい場合
       */
      if (
        moment(
          operation.trip_operation_lists[
            operation.trip_operation_lists.length - 1
          ].end_time.arrival_time,
          'HH:mm:ss',
        )
          .subtract(now.hour() < 4 ? 1 : 0, 'days')
          .add(
            operation.trip_operation_lists[
              operation.trip_operation_lists.length - 1
            ].end_time.arrival_days - 1,
            'days',
          ) <= now
      ) {
        base.current_position.prev =
          operation.trip_operation_lists[
            operation.trip_operation_lists.length - 1
          ];
        return base;
      }

      return base;
    });

    return { operations: currentPosition };
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

  @Get('/trips')
  async getOperationsTrips(@Query() query: { calendar_id: string }): Promise<{
    operations: Operation[];
  }> {
    if (!query.calendar_id) {
      throw new HttpException(
        'Please set `calendar_id` query.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const qb = this.operationService.createQueryBuilder('operation');
    let searchQuery = qb;
    if (query.calendar_id !== undefined) {
      searchQuery = searchCalendarId(
        'operation',
        query.calendar_id,
        searchQuery,
      );
    }
    const operationTrips = await searchQuery
      .leftJoinAndSelect('operation.trip_operation_lists', 'tripOperationList')
      .leftJoinAndSelect('tripOperationList.trip', 'trip')
      .leftJoinAndSelect('trip.times', 'times')
      .andWhere('operation.operation_number != :number', { number: '100' })
      .orderBy('operation.operation_number', 'ASC')
      .addOrderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')
      .getMany();

    return { operations: operationTrips };
  }

  @Get('/:id')
  async getOperationById(
    @Param('id') operationId: string,
  ): Promise<{ operation: Operation }> {
    const operation = await this.operationService.findOne({
      where: { id: operationId },
    });

    return { operation };
  }

  @Get('/:id/trips')
  async getOperationByIdTrips(@Param('id') operationId: string): Promise<any> {
    const qb = this.operationService.createQueryBuilder('operation');
    const operationTrips = await qb
      .leftJoinAndSelect('operation.trip_operation_lists', 'tripOperationList')
      .leftJoinAndSelect('tripOperationList.trip', 'trip')
      .leftJoinAndSelect('trip.times', 'times')
      .andWhere('operation.id = :id', { id: operationId })
      .orderBy('operation.operation_number', 'ASC')
      .addOrderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')
      .getOne();

    return { operation: operationTrips };
  }

  @Get('/search/numbers')
  async searchOperationNumbers(@Query()
  query: {
    calendar_id: string;
  }): Promise<Array<{ operation_number: string }>> {
    const qb = await this.operationService.createQueryBuilder('operation');
    let searchQuery = qb;
    if (query.calendar_id !== undefined) {
      searchQuery = searchCalendarId(
        'operation',
        query.calendar_id,
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

  @Get('/by-calendar/:calendarId/sightings')
  async getOperationsByCalendarIdSightings(
    @Param('calendarId') calendarId: string,
  ): Promise<Operation[]> {
    const calendars = await this.calendarService.findAll({
      where: {
        start_date: LessThanOrEqual('2019-08-13'),
        end_date: null,
      },
      order: {
        sunday: 'ASC',
      },
    });

    const calendarsId = calendars.map(obj => obj.id);

    const operations = await this.operationService.findAll({
      where: {
        calendar_id: In(calendarsId),
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

  /*
  @Get('/sightings')
  async getOperationSightings(): Promise<OperationSighting[]> {
    const sightings = await this.operationSightingService.findAll();
    return sightings;
  }
  */

  @Post('/sightings')
  async addOperationSightings(@Body()
  body: {
    formation_id: string;
    operation_id: string;
    sighting_time: string;
  }): Promise<{ operation_sighting: OperationSighting }> {
    const sighting = await this.operationSightingService.save(body);
    return { operation_sighting: sighting };
  }
}

const searchCalendarId = (
  tableName: string,
  calendarId: string,
  qb: SelectQueryBuilder<any>,
) => {
  return qb.andWhere(`${tableName}.calendar_id = :calendarId`, { calendarId });
};
