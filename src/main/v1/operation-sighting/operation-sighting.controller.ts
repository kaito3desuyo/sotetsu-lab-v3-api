import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { AuthGuard } from '../../../shared/guards/auth.guard';
import { NewOperationSightingService } from './operation-sighting.service';
import {
  uniqBy,
  sortBy,
  reverse,
  groupBy,
  map,
  some,
  get,
  find,
  flatMap,
  filter,
} from 'lodash';
import { OperationSighting } from '../operation/operation-sighting.entity';
import moment from 'moment';
import { OperationService } from '../operation/operation.service';
import {
  Equal,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOperator,
} from 'typeorm';

@Controller()
@UseGuards(AuthGuard)
export class OperationSightingController {
  constructor(
    private operationService: OperationService,
    private operationSightingService: NewOperationSightingService,
  ) {}

  @Get()
  async getOperationSightings(@Query()
  query?: {
    formation_id?: string;
    operation_id?: string;
    start_sighting_time?: string;
    end_sighting_time?: string;
    page?: number;
    per?: number;
    order?: string;
  }): Promise<any> {
    const whereObject: {
      [K in keyof Partial<OperationSighting>]: FindOperator<
        OperationSighting[K]
      >
    } = {};

    if (query.formation_id) {
      whereObject.formation_id = Equal(query.formation_id);
    }
    if (query.operation_id) {
      whereObject.operation_id = Equal(query.operation_id);
    }
    if (query.start_sighting_time && query.end_sighting_time) {
      whereObject.sighting_time = Between(
        query.start_sighting_time,
        query.end_sighting_time,
      );
    } else if (query.start_sighting_time) {
      whereObject.sighting_time = MoreThanOrEqual(
        new Date(query.start_sighting_time),
      );
    } else if (query.end_sighting_time) {
      whereObject.sighting_time = LessThanOrEqual(
        new Date(query.end_sighting_time),
      );
    }

    const orderObject: {
      [K in keyof Partial<OperationSighting>]: 'ASC' | 'DESC'
    } = {};

    if (query.order) {
      const order = query.order.split(',');
      order.forEach(prop => {
        if (prop[0] === '-') {
          orderObject[prop.slice(1)] = 'DESC';
        } else {
          orderObject[prop] = 'ASC';
        }
      });
    }

    const result = await this.operationSightingService.findMany({
      where: whereObject,
      orderBy: orderObject,
      pageIndex: query.page,
      pageSize: query.per,
      relations: ['formation', 'operation'],
    });

    return {
      operation_sightings: result.items,
      pagination: {
        total_items: result.totalItems,
        total_pages: result.pageCount,
      },
    };
  }

  @Get('/latest')
  async getOperationSightingsLatest(
    @Query('calendar_id') calendarId: string,
  ): Promise<any> {
    const isExistNewerSighting = (
      target: OperationSighting,
      all: OperationSighting[],
      path: string,
    ) => {
      return some(all, data => {
        return (
          get(target, path) === get(data, path) &&
          (moment(target.sighting_time) < moment(data.sighting_time) ||
            (moment(target.sighting_time).isSame(data.sighting_time) &&
              moment(target.updated_at) < moment(data.updated_at)))
        );
      });
    };

    const circulateOperationNumber = (target: string, days: number) => {
      const operationNumber = Number(target);
      let added = operationNumber;
      for (let i = 0; i < days; i++) {
        switch (String(added).slice(0, 1)) {
          case '1':
            added = added + 1;
            if (String(added).slice(-1) === '6') {
              added = added - 5;
            }
            break;
          case '7':
            added = added + 1;
            if (String(added).slice(-1) === '5') {
              added = added - 4;
            }
            break;
          case '8':
          case '9':
            return null;
          /*
            switch (added) {
              case 91:
                return '86';
              case 92:
                return '84';
              case 93:
                return '82';
              case 94:
                return '83';
              case 95:
                return '81';
              case 96:
                return '85';
            }
            break;
            */
          default:
            added = added + 1;
            if (String(added).slice(-1) === '0') {
              added = added - 9;
            }
        }
      }
      return String(added);
    };

    const calcDayDifference = (timestamp: Date | string) => {
      return moment()
        .subtract(moment().hour() < 4 ? 1 : 0, 'days')
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .diff(
          moment(timestamp)
            .subtract(moment(timestamp).hour() < 4 ? 1 : 0, 'days')
            .hour(0)
            .minute(0)
            .second(0)
            .millisecond(0),
          'days',
        );
    };

    const todaysOperations = await this.operationService.findAll({
      where: {
        calendar_id: calendarId,
      },
    });

    const groupByOperation = await this.operationSightingService.getOperationSightingsLatestGroupByOperations();
    const groupByFormation = await this.operationSightingService.getOperationSightingsLatestGroupByFormations();

    const merged = [].concat(groupByOperation, groupByFormation);
    const uniq = uniqBy(merged, data => data.id);
    const sorted = sortBy(uniq, [
      data1 => data1.sighting_time,
      data2 => data2.updated_at,
    ]);
    const reversed = reverse(sorted);

    const operationSightingsCirculated = reversed.map(operationSighting => {
      const currentOperationNumber = operationSighting.operation
        ? operationSighting.operation.operation_number
        : null;
      const circulatedOperationNumber =
        currentOperationNumber !== '100' && currentOperationNumber !== null
          ? circulateOperationNumber(
              currentOperationNumber,
              calcDayDifference(operationSighting.sighting_time),
            )
          : currentOperationNumber;

      const circulatedOperation = circulatedOperationNumber
        ? find(
            todaysOperations,
            o => o.operation_number === circulatedOperationNumber,
          ) || null
        : null;

      return {
        ...operationSighting,
        circulated_operation_id: circulatedOperation
          ? circulatedOperation.id
          : null,
        circulated_operation: circulatedOperation,
      };
    });

    const operationSightingsFiltered = operationSightingsCirculated.map(
      (target, index, array) => {
        return {
          ...target,
          circulated_operation_id:
            target.operation &&
            target.operation.operation_number !== '100' &&
            (isExistNewerSighting(
              target,
              array,
              'formation.formation_number',
            ) ||
              isExistNewerSighting(
                target,
                array,
                'circulated_operation.operation_number',
              ))
              ? null
              : target.circulated_operation_id,
          circulated_operation:
            target.operation &&
            target.operation.operation_number !== '100' &&
            (isExistNewerSighting(
              target,
              array,
              'formation.formation_number',
            ) ||
              isExistNewerSighting(
                target,
                array,
                'circulated_operation.operation_number',
              ))
              ? null
              : target.circulated_operation,
        };
      },
    );

    // 編成別
    const formationGroupedAgain = groupBy(
      operationSightingsFiltered,
      data => data.formation.formation_number,
    );
    const formationFlattedAgain: OperationSighting[] = flatMap(
      formationGroupedAgain,
      (value, key) => {
        return value[0];
      },
    );

    // 運用別
    const operationGroupedAgain = groupBy(operationSightingsFiltered, data =>
      data.circulated_operation
        ? data.circulated_operation.operation_number
        : null,
    );
    const operationFlattedAgain: OperationSighting[] = flatMap(
      operationGroupedAgain,
      (value, key) => {
        return value[0];
      },
    );

    return {
      group_by_formations: formationFlattedAgain,
      group_by_operations: operationFlattedAgain,
    };
  }
}
