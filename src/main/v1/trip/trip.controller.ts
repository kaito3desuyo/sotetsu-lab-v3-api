import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { SelectQueryBuilder, DeepPartial } from 'typeorm';
import { filter, isArray, sortBy, find } from 'lodash';
import { TripBlockService } from './trip_block.service';
import { TripClass } from './trip_class.entity';
import { TripClassService } from './trip_class.service';
import { TripBlock } from './trip_block.entity';
import { CreateTripBlockDto } from './trip_block.dto';
import { Trip } from './trip.entity';
import { TripOperationListService } from '../trip-operation-list/trip_operation_list.service';

@Controller()
export class TripController {
  constructor(
    private tripService: TripService,
    private tripBlockService: TripBlockService,
    private tripClassService: TripClassService,
    private tripOperationListService: TripOperationListService,
  ) {}

  /**
   * 列車
   */
  @Get()
  async getTrips(): Promise<any> {
    return 'Welcome to Trip API!';
  }

  @Get('/search')
  async searchTrips(@Query()
  query: {
    calendar_id: string;
    trip_direction: 0 | 1;
  }): Promise<any> {
    const qb = this.tripService.createQueryBuilder('trip');
    let searchQuery = qb;

    if (query.calendar_id !== undefined) {
      searchQuery = searchCalendarId(query.calendar_id, searchQuery);
    }
    if (query.trip_direction !== undefined) {
      searchQuery = searchTripDirection(query.trip_direction, searchQuery);
    }

    const trips = await searchQuery
      .leftJoinAndSelect('trip.times', 'times')
      .orderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')
      .getMany();

    return trips;
  }

  @Get('/search/by-blocks')
  async searchTripsByBlocks(@Query()
  query: {
    calendar_id: string;
    trip_direction: '0' | '1';
  }): Promise<{
    trip_blocks: TripBlock[];
  }> {
    const tripBlocks = await this.tripBlockService
      .createQueryBuilder('trip_blocks')
      .leftJoinAndSelect('trip_blocks.trips', 'trips')
      .leftJoinAndSelect('trips.times', 'times')
      .leftJoinAndSelect('trips.trip_operation_lists', 'trip_operation_lists')
      .leftJoinAndSelect('trip_operation_lists.operation', 'operation')
      .leftJoinAndSelect('trips.trip_class', 'trip_class')
      /*
            .where(new Brackets(qb => {
                qb.where("trips.trip_number = :number", { number: '6006' })
                    .orWhere("trips.trip_number = :number2", { number2: '9414' })
            }))
            */
      .andWhere('trips.calendar_id = :calendarId', {
        calendarId: query.calendar_id,
      })
      .andWhere('trips.trip_direction = :tripDirection', {
        tripDirection: query.trip_direction,
      })

      .orderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')

      .getMany();

    return { trip_blocks: tripBlocks };
  }

  @Patch('/:id/add-to-block/:targetTripBlockId')
  async addTripToTripBlockById(
    @Param('id') tripId: string,
    @Param('targetTripBlockId') targetTripBlockId: string,
  ) {
    const beforeTargetTrip = await this.tripService.findOne({
      where: {
        id: tripId,
      },
    });

    const tripUpdateResult = await this.tripService.update(tripId, {
      trip_block_id: targetTripBlockId,
    });

    const tripCountInTripBlockWhenBeforeUpdate = await this.tripService.count({
      where: {
        trip_block_id: beforeTargetTrip.trip_block_id,
      },
    });

    if (tripCountInTripBlockWhenBeforeUpdate === 0) {
      await this.tripBlockService.delete(beforeTargetTrip.trip_block_id);
    }

    return tripUpdateResult;
  }

  @Patch('/:id/remove-from-block')
  async removeTripFromTripBlockById(@Param('id') tripId: string) {
    const beforeTargetTrip = await this.tripService.findOne({
      where: {
        id: tripId,
      },
    });

    const createdBlankTripBlock = await this.tripBlockService.insert({});

    const tripUpdateResult = await this.tripService.update(tripId, {
      trip_block_id: createdBlankTripBlock.identifiers[0].id,
    });

    const tripCountInTripBlockWhenBeforeUpdate = await this.tripService.count({
      where: {
        trip_block_id: beforeTargetTrip.trip_block_id,
      },
    });

    if (tripCountInTripBlockWhenBeforeUpdate === 0) {
      await this.tripBlockService.delete(beforeTargetTrip.trip_block_id);
    }

    return tripUpdateResult;
  }

  @Delete('/:id')
  async deleteTripById(@Param('id') tripId: string) {
    const result = await this.tripService.delete(tripId);

    return result;
  }

  @Get('/blocks/:id')
  async getTripBlockById(@Param('id') blockId: string) {
    const tripBlock = await this.tripBlockService.findOne({
      where: {
        id: blockId,
      },
      relations: ['trips', 'trips.times', 'trips.trip_operation_lists'],
    });

    return { trip_block: tripBlock };
  }

  @Post('/blocks')
  async addTripBlocks(
    @Body() body: CreateTripBlockDto[],
  ): Promise<{ trip_blocks: Array<DeepPartial<TripBlock>> }> {
    const result = await this.tripBlockService.save(body);

    const trips: Array<DeepPartial<Trip>> = [];
    (result as Array<DeepPartial<TripBlock>>).forEach(tripBlock => {
      tripBlock.trips.forEach(trip => {
        trips.push(trip);
      });
    });

    const observer = [];
    trips.forEach(trip => {
      const times = sortBy(trip.times, o => o.stop_sequence);
      trip.trip_operation_lists.forEach(tripOperationList => {
        observer.push(
          this.tripOperationListService.update(tripOperationList.id, {
            start_time_id: find(
              times,
              o => o.station_id === tripOperationList.start_station_id,
            )
              ? find(
                  times,
                  o => o.station_id === tripOperationList.start_station_id,
                ).id
              : null,
            end_time_id: find(
              times,
              o => o.station_id === tripOperationList.end_station_id,
            )
              ? find(
                  times,
                  o => o.station_id === tripOperationList.end_station_id,
                ).id
              : null,
          }),
        );
      });
    });

    await Promise.all(observer);

    return { trip_blocks: !isArray(result) ? [result] : result };
  }

  @Put('/blocks/:id')
  async updateTripBlockById(@Param('id') id: string, @Body() body: any) {
    const result = await this.tripBlockService.save({
      id,
      ...body,
    });

    const trips: Array<DeepPartial<Trip>> = [];
    (result as DeepPartial<TripBlock>).trips.forEach(trip => {
      trips.push(trip);
    });

    const observer = [];
    trips.forEach(trip => {
      const times = sortBy(trip.times, o => o.stop_sequence);
      trip.trip_operation_lists.forEach(tripOperationList => {
        observer.push(
          this.tripOperationListService.update(tripOperationList.id, {
            start_time_id: find(
              times,
              o => o.station_id === tripOperationList.start_station_id,
            )
              ? find(
                  times,
                  o => o.station_id === tripOperationList.start_station_id,
                ).id
              : null,
            end_time_id: find(
              times,
              o => o.station_id === tripOperationList.end_station_id,
            )
              ? find(
                  times,
                  o => o.station_id === tripOperationList.end_station_id,
                ).id
              : null,
          }),
        );
      });
    });

    await Promise.all(observer);

    return { trip_block: result };
  }

  /**
   * 種別
   */
  @Get('/classes')
  async getTripClasses(@Query() query: { service_id: string }): Promise<{
    trip_classes: TripClass[];
  }> {
    const whereObj = {};
    if (query.service_id) {
      // tslint:disable-next-line: no-string-literal
      whereObj['service_id'] = query.service_id;
    }

    const tripClasses = await this.tripClassService.findAll({
      where: whereObj,
      order: {
        sequence: 'ASC',
      },
    });
    return { trip_classes: tripClasses };
  }
}

const searchTripDirection = (direction: 0 | 1, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('trip_direction = :direction', { direction });
};

const searchCalendarId = (calendarId: string, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('calendar_id = :calendarId', { calendarId });
};
