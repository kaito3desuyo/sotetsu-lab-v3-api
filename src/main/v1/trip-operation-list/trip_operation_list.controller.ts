import { Controller, Get, Query } from '@nestjs/common';
import { TripOperationListService } from './trip_operation_list.service';
import { TripOperationList } from './trip_operation_list.entity';
import { SelectQueryBuilder } from 'typeorm';

@Controller()
export class TripOperationListController {
  constructor(private tripOperationListService: TripOperationListService) {}

  @Get()
  async getTripOperationList(): Promise<{
    trip_operation_lists: TripOperationList[];
  }> {
    const tripOperationList = await this.tripOperationListService.findAll();
    return { trip_operation_lists: tripOperationList };
  }

  @Get('/search')
  async searchTripOperationList(@Query()
  query: {
    operation_id?: string;
  }): Promise<any> {
    const qb = this.tripOperationListService.createQueryBuilder(
      'trip_operation_list',
    );
    let searchQuery = qb;

    if (query.operation_id !== undefined) {
      searchQuery = searchOperationId(query.operation_id, searchQuery);
    }

    const tripOperationList = await searchQuery
      .leftJoinAndSelect('trip_operation_list.trip', 'trip')
      .leftJoinAndSelect('trip_operation_list.operation', 'operation')
      .leftJoinAndSelect('trip_operation_list.start_time', 'start_time')
      .leftJoinAndSelect('trip_operation_list.end_time', 'end_time')
      .leftJoinAndSelect('trip.trip_class', 'trip_class')
      .addOrderBy('start_time.departure_days', 'ASC')
      .addOrderBy('start_time.departure_time', 'ASC')
      // .addOrderBy('end_time.arrival_days', 'ASC')
      // .addOrderBy('end_time.arrival_time', 'ASC')
      .getMany();

    return { trip_operation_lists: tripOperationList };
  }
}

const searchOperationId = (
  operationId: string,
  qb: SelectQueryBuilder<any>,
) => {
  return qb.andWhere('operation_id = :operationId', { operationId });
};