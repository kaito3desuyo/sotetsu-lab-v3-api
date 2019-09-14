import { Controller, Get, Query } from '@nestjs/common';
import { TripService } from './trip.service';
import { SelectQueryBuilder } from 'typeorm';
import { filter } from 'lodash';
import { TripBlockService } from './trip_block.service';
import { TripClass } from './trip_class.entity';
import { TripClassService } from './trip_class.service';

@Controller()
export class TripController {
  constructor(
    private tripService: TripService,
    private tripBlockService: TripBlockService,
    private tripClassService: TripClassService,
  ) {}

  @Get()
  async getTrips(): Promise<any> {
    return 'Welcome to Trip API!';
  }

  @Get('/search')
  async searchTrips(@Query()
  query: {
    calender_id: string;
    trip_direction: 0 | 1;
  }): Promise<any> {
    const qb = this.tripService.createQueryBuilder('trip');
    let searchQuery = qb;

    if (query.calender_id !== undefined) {
      searchQuery = searchCalenderId(query.calender_id, searchQuery);
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
  async searchTripsByBlocks(@Query() query: { calender_id: string }): Promise<
    any
  > {
    const tripBlocks = await this.tripBlockService
      .createQueryBuilder('trip_blocks')
      .leftJoinAndSelect('trip_blocks.trips', 'trips')
      .leftJoinAndSelect('trips.times', 'times')
      /*
            .where(new Brackets(qb => {
                qb.where("trips.trip_number = :number", { number: '6006' })
                    .orWhere("trips.trip_number = :number2", { number2: '9414' })
            }))
            */
      .andWhere('trips.calender_id = :calenderId', {
        calenderId: query.calender_id,
      })

      .orderBy('times.departure_days', 'ASC')
      .addOrderBy('times.departure_time', 'ASC')

      .getMany();

    return filter(tripBlocks, (o, i) => {
      return 0 <= i && i < tripBlocks.length;
    });
  }

  /**
   * 種別
   */
  @Get('/classes')
  async getTripClasses(@Query() query: { service_id: string }): Promise<
    TripClass[]
  > {
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
    return tripClasses;
  }
}

const searchTripDirection = (direction: 0 | 1, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('trip_direction = :direction', { direction });
};

const searchCalenderId = (calenderId: string, qb: SelectQueryBuilder<any>) => {
  return qb.andWhere('calender_id = :calenderId', { calenderId });
};
