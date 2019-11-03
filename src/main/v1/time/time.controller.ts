import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { AuthGuard } from '../../../shared/guards/auth.guard';
import { TimeService } from './time.service';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';

@Controller()
@UseGuards(AuthGuard)
export class TimeController {
  constructor(private timeService: TimeService) {}

  @Get()
  async getTimes(): Promise<string> {
    return 'Welcome to Time API!';
  }

  @Get('/search')
  async searchTimes(@Query()
  query: {
    station_id?: string;
    calendar_id?: string;
    trip_direction?: 0 | 1;
  }): Promise<any> {
    const qb = this.timeService.createQueryBuilder('times');
    let searchQuery = qb;

    if (query.station_id !== undefined) {
      searchQuery = searchStationId(query.station_id, searchQuery);
    }

    if (query.calendar_id !== undefined) {
      searchQuery = searchCalendarId(query.calendar_id, searchQuery);
    }

    if (query.trip_direction !== undefined) {
      searchQuery = searchTripDirection(query.trip_direction, searchQuery);
    }

    const times = await searchQuery
      .leftJoinAndSelect('times.trip', 'trip')
      .leftJoinAndSelect('trip.trip_block', 'trip_block')
      .leftJoinAndSelect('trip_block.trips', 'same_block_trips')
      .leftJoinAndSelect('same_block_trips.trip_class', 'same_block_trip_class')
      .leftJoinAndSelect(
        'same_block_trips.trip_operation_lists',
        'same_block_trip_operation_lists',
      )
      .leftJoinAndSelect(
        'same_block_trip_operation_lists.start_station',
        'same_block_trip_start_station',
      )
      .leftJoinAndSelect(
        'same_block_trip_operation_lists.end_station',
        'same_block_trip_end_station',
      )
      .leftJoinAndSelect('trip.trip_class', 'trip_class')
      .leftJoinAndSelect('trip.trip_operation_lists', 'trip_operation_lists')
      .leftJoinAndSelect('trip_operation_lists.operation', 'operation')
      .leftJoinAndSelect('trip_operation_lists.start_station', 'start_station')
      .leftJoinAndSelect('trip_operation_lists.end_station', 'end_station')
      .orderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')
      .getMany();

    return { times };
  }
}

const searchStationId = (stationId: string, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('times.station_id = :stationId', { stationId });
};

const searchCalendarId = (calendarId: string, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('trip.calendar_id = :calendarId', { calendarId });
};

const searchTripDirection = (direction: 0 | 1, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('trip.trip_direction = :direction', { direction });
};
