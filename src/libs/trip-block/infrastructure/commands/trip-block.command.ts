import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { Repository } from 'typeorm';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockCommand extends TypeOrmCrudService<TripBlockModel> {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {
        super(tripBlockRepository);
    }

    async deleteTripBlockById(tripBlockId: string): Promise<void> {
        await this.tripBlockRepository.delete(tripBlockId);
    }
}
