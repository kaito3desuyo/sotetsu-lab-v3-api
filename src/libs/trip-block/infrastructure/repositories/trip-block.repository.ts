import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomRepository } from 'src/core/classes/custom-repository';
import { Repository } from 'typeorm';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockRepository extends CustomRepository<TripBlockModel> {
    constructor(
        @InjectRepository(TripBlockModel)
        protected readonly repository: Repository<TripBlockModel>,
    ) {
        super(repository);
    }
}
