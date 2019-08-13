import { Controller, Get, Param } from '@nestjs/common';
import { Operation } from './operation.entity';
import { OperationService } from './operation.service';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import {
  Connection,
  In,
  Not,
  MoreThan,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { CalenderService } from '../calender/calender.service';
import { Calender } from '../calender/calender.entity';

@Controller()
export class OperationController {
  constructor(
    private connection: Connection,
    private calenderService: CalenderService,
    private operationService: OperationService,
    private operationSightingService: OperationSightingService,
  ) {}

  @Get()
  async getOperations(): Promise<Operation[]> {
    const operations = await this.operationService.findAll();
    return operations;
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

    console.log(calenders);

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
}
