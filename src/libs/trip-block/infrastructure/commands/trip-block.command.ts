import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { Repository } from 'typeorm';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { buildTripBlockDetailsDto } from '../builders/trip-block-dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockCommand extends TypeOrmCrudService<TripBlockModel> {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {
        super(tripBlockRepository);
    }

    async createEmptyTripBlock(): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository.save({});
        return buildTripBlockDetailsDto(model);
    }

    async deleteTripBlockById(tripBlockId: string): Promise<void> {
        await this.tripBlockRepository.delete(tripBlockId);
    }
}
