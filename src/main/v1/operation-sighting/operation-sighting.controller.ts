import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { AuthGuard } from '../../../shared/guards/auth.guard';
import { OperationSightingService } from '../operation/operation-sightings.service';
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
} from 'lodash';
import { OperationSighting } from '../operation/operation-sighting.entity';
import moment from 'moment';
import { OperationService } from '../operation/operation.service';

@Controller()
@UseGuards(AuthGuard)
export class OperationSightingController {
  constructor(
    private operationService: OperationService,
    private operationSightingService: NewOperationSightingService,
  ) {}

  @Get()
  async getOperationSightings(): Promise<any> {
    return await this.operationSightingService.paginate({
      page: 0,
      limit: 10,
    });
  }

  @Get('/search')
  async searchOperationSightings(@Query()
  query?: {
    formation_id?: string;
    operation_id?: string;
    sighting_time_start?: string;
    sighting_time_end?: string;
    page?: string;
    per?: string;
    sort_by?: string;
    sort_direction?: 'ASC' | 'DESC';
  }): Promise<any> {
    const qb = this.operationSightingService.createQueryBuilder(
      'operation_sightings',
    );
    let searchQuery = qb;

    if (query.formation_id) {
      searchQuery = qb.andWhere('formation_id = :formationId', {
        formationId: query.formation_id,
      });
    }

    if (query.operation_id) {
      searchQuery = qb.andWhere('operation_id = :operationId', {
        operationId: query.operation_id,
      });
    }

    if (query.sighting_time_start) {
      searchQuery = qb.andWhere(':startDate <= sighting_time', {
        startDate: query.sighting_time_start,
      });
    }

    if (query.sighting_time_end) {
      searchQuery = qb.andWhere('sighting_time <= :endDate', {
        endDate: query.sighting_time_end,
      });
    }

    if (query.page && query.per) {
      searchQuery = qb.take(Number(query.per));
      searchQuery = qb.skip(Number(query.page) * Number(query.per));
    }

    if (
      query.sort_by &&
      query.sort_direction &&
      (query.sort_direction === 'ASC' || query.sort_direction === 'DESC')
    ) {
      searchQuery = qb.addOrderBy(query.sort_by, query.sort_direction);
    }

    const operationSightings = await searchQuery.getMany();

    return {
      operation_sightings: operationSightings,
      date: moment().toISOString(),
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

    const formationGrouped = groupBy(
      reversed,
      data => data.formation.formation_number,
    );
    const operationGrouped = groupBy(
      reversed,
      data => data.operation.operation_number,
    );

    const formationDuplicateChecked: OperationSighting[] = map(
      formationGrouped,
      (value, key) => {
        return value[0];
      },
    );
    const operationDuplicateChecked: OperationSighting[] = flatMap(
      operationGrouped,
      (value, key) => {
        if (key === '100') {
          return value;
        }
        return value[0];
      },
    );

    const formationNewestSightings = formationDuplicateChecked.map(target => {
      const checker =
        target.operation.operation_number !== '100' &&
        isExistNewerSighting(
          target,
          formationDuplicateChecked,
          'operation.operation_number',
        );
      const checker2 =
        target.operation.operation_number !== '100' &&
        isExistNewerSighting(
          target,
          operationDuplicateChecked,
          'operation.operation_number',
        );
      return {
        ...target,
        operation_id: checker || checker2 ? null : target.operation_id,
        operation: checker || checker2 ? null : target.operation,
      };
    });
    const operationNewestSightings = operationDuplicateChecked.map(target => {
      const checker =
        target.operation.operation_number !== '100' &&
        isExistNewerSighting(
          target,
          formationDuplicateChecked,
          'formation.formation_number',
        );
      const checker2 =
        target.operation.operation_number !== '100' &&
        isExistNewerSighting(
          target,
          operationDuplicateChecked,
          'formation.formation_number',
        );

      return {
        ...target,
        formation_id: checker || checker2 ? null : target.formation_id,
        formation: checker || checker2 ? null : target.formation,
      };
    });

    const formationSightingsCirculated = formationNewestSightings.map(
      formationSighting => {
        const currentOperationNumber = formationSighting.operation
          ? formationSighting.operation.operation_number
          : null;
        const circulatedOperationNumber =
          currentOperationNumber !== '100' && currentOperationNumber !== null
            ? circulateOperationNumber(
                currentOperationNumber,
                calcDayDifference(formationSighting.sighting_time),
              )
            : currentOperationNumber;

        const circulatedOperation = circulatedOperationNumber
          ? find(
              todaysOperations,
              o => o.operation_number === circulatedOperationNumber,
            ) || null
          : null;

        return {
          ...formationSighting,
          circulated_operation_id: circulatedOperation
            ? circulatedOperation.id
            : null,
          circulated_operation: circulatedOperation,
        };
      },
    );

    const operationSightingsCirculated = operationNewestSightings.map(
      operationSighting => {
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
      },
    );

    const formationNewestSightingsAgain = formationSightingsCirculated.map(
      (target, index, array) => {
        return {
          ...target,
          circulated_operation_id:
            target.operation &&
            target.operation.operation_number !== '100' &&
            isExistNewerSighting(
              target,
              array,
              'circulated_operation.operation_number',
            )
              ? null
              : target.circulated_operation_id,
          circulated_operation:
            target.operation &&
            target.operation.operation_number !== '100' &&
            isExistNewerSighting(
              target,
              array,
              'circulated_operation.operation_number',
            )
              ? null
              : target.circulated_operation,
        };
      },
    );

    const operationNewestSightingsAgain = operationSightingsCirculated.map(
      (target, index, array) => {
        return {
          ...target,
          circulated_operation_id:
            target.operation &&
            target.operation.operation_number !== '100' &&
            isExistNewerSighting(
              target,
              array,
              'circulated_operation.operation_number',
            )
              ? null
              : target.circulated_operation_id,
          circulated_operation:
            target.operation &&
            target.operation.operation_number !== '100' &&
            isExistNewerSighting(
              target,
              array,
              'circulated_operation.operation_number',
            )
              ? null
              : target.circulated_operation,
        };
      },
    );

    return {
      group_by_formations: formationNewestSightingsAgain,
      group_by_operations: operationNewestSightingsAgain,
    };
  }
}
