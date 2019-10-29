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
    return 'OperationSightings';
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
          (moment(target.sighting_time) < moment(data.sighting_time) || (moment(target.sighting_time).isSame(data.sighting_time) && moment(target.updated_at) < moment(data.updated_at)))
        );
      });
    };

    const circulateOperationNumber = (target: string, days: number) => {
      const operationNumber = Number(target);
      let added = operationNumber;
      for (let i = 1; i <= days; i++) {
        added = added + 1;
        if (String(added).slice(-1) === '0') {
          added = added - 9;
        }
      }
      return String(added);
    };

    const calcDayDifference = (timestamp: Date | string) => {
      return (
        moment()
          .subtract(moment().hour() < 4 ? 1 : 0)
          .day() -
        moment(timestamp)
          .subtract(moment(timestamp).hour() < 4 ? 1 : 0, 'days')
          .day()
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
    const sorted = sortBy(uniq, data => data.sighting_time);
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
