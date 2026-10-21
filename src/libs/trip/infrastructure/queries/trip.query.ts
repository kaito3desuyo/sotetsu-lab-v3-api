import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto.js';
import {
    TripDtoBuilder,
    TripsDtoBuilder,
} from '../builders/trip.dto.builder.js';
import { TripModel } from '../models/trip.model.js';

@Injectable()
export class TripQuery {
    constructor(
        @InjectRepository(TripModel)
        private readonly tripRepository: Repository<TripModel>,
    ) {}

    async findOneTripById(tripId: string): Promise<TripDetailsDto | null> {
        const model = await this.tripRepository.findOne({
            where: { id: tripId },
        });
        if (!model) return null;
        return TripDtoBuilder.buildFromModel(model);
    }

    async findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
    }): Promise<TripDetailsDto[]> {
        const { stationId, calendarId, tripDirection } = params;

        const models = await this.tripRepository
            .createQueryBuilder('trip')
            .select('trip')
            .innerJoin(
                'trip.times',
                'stationTime',
                'stationTime.stationId = :stationId AND (stationTime.pickupType = 0 OR stationTime.dropoffType = 0 OR (stationTime.pickupType = 1 AND stationTime.dropoffType = 1 AND (stationTime.departureTime IS NOT NULL OR stationTime.arrivalTime IS NOT NULL)))',
                { stationId },
            )
            .leftJoinAndSelect('trip.times', 'times')
            .leftJoinAndSelect('trip.tripOperationLists', 'tripOperationLists')
            .where('trip.calendarId = :calendarId', { calendarId })
            .andWhere('trip.tripDirection = :tripDirection', { tripDirection })
            .orderBy('stationTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.arrivalTime', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureTime', 'ASC', 'NULLS LAST')
            .getMany();

        return TripsDtoBuilder.buildFromModel(models);
    }

    async countTripByTripBlockId(tripBlockId: string): Promise<number> {
        const count = await this.tripRepository.count({
            where: {
                tripBlockId,
            },
        });
        return count;
    }
}
