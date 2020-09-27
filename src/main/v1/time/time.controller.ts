import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { TimeService } from './time.service';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import { Brackets } from 'typeorm';

@Controller()
@UseGuards(AuthGuard)
export class TimeController {
    constructor(private timeService: TimeService) {}

    @Get()
    async getTimes(): Promise<string> {
        return 'Welcome to Time API!';
    }

    @Get('/search')
    async searchTimes(
        @Query()
        query: {
            station_id?: string;
            calendar_id?: string;
            trip_direction?: 0 | 1;
        },
    ): Promise<any> {
        const qb = this.timeService.createQueryBuilder('times');
        let searchQuery = qb;

        if (query.station_id !== undefined) {
            searchQuery = searchStationId(query.station_id, searchQuery);
        }

        if (query.calendar_id !== undefined) {
            searchQuery = searchCalendarId(query.calendar_id, searchQuery);
        }

        if (query.trip_direction !== undefined) {
            searchQuery = searchTripDirection(
                query.trip_direction,
                searchQuery,
            );
        }

        const times = await searchQuery
            .leftJoinAndSelect('times.trip', 'trip')
            .leftJoinAndSelect('trip.times', 'trip_times')
            .leftJoinAndSelect('trip.trip_block', 'trip_block')
            .leftJoinAndSelect(
                'trip_block.trips',
                'same_block_trips',
                'same_block_trips.id != trip.id',
            )
            .leftJoinAndSelect(
                'same_block_trips.trip_class',
                'same_block_trip_class',
            )
            .leftJoinAndSelect(
                'same_block_trips.times',
                'same_block_trip_times',
            )
            .leftJoinAndSelect(
                'same_block_trips.trip_operation_lists',
                'same_block_trip_operation_lists',
            )
            .leftJoinAndSelect('trip.trip_class', 'trip_class')
            .leftJoinAndSelect(
                'trip.trip_operation_lists',
                'trip_operation_lists',
            )
            .leftJoinAndSelect('trip_operation_lists.operation', 'operation')

            .andWhere(
                new Brackets((sub) => {
                    sub.where('times.pickup_type = 0')
                        .orWhere('times.dropoff_type = 0')
                        .orWhere(
                            new Brackets((sub2) => {
                                sub2.where('times.pickup_type = 1')
                                    .andWhere('times.pickup_type = 1')
                                    .andWhere(
                                        new Brackets((sub3) => {
                                            sub3.where(
                                                'times.departure_time IS NOT NULL',
                                            ).orWhere(
                                                'times.arrival_time IS NOT NULL',
                                            );
                                        }),
                                    );
                            }),
                        );
                }),
            )

            .addOrderBy('times.departure_days', 'ASC')
            .addOrderBy('times.departure_time', 'ASC')
            .addOrderBy('trip_times.stop_sequence', 'ASC')
            .addOrderBy('same_block_trip_times.departure_days', 'ASC')
            .addOrderBy('same_block_trip_times.departure_time', 'ASC')
            .addOrderBy('same_block_trip_times.stop_sequence', 'ASC')
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
