import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { Repository } from 'typeorm';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { buildTripDetailsDto } from '../builders/trip-dto.builder';
import { TripModel } from '../models/trip.model';

@Injectable()
export class TripCommand extends TypeOrmCrudService<TripModel> {
    constructor(
        @InjectRepository(TripModel)
        private readonly tripRepository: Repository<TripModel>,
    ) {
        super(tripRepository);
    }

    async updateTripBlockId(
        tripId: string,
        tripBlockId: string,
    ): Promise<TripDetailsDto> {
        await this.tripRepository.update(tripId, { tripBlockId });

        const trip = await this.tripRepository.findOne(tripId);
        return buildTripDetailsDto(trip);
    }
}
