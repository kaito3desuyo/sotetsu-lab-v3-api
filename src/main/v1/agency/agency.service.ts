import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Agency } from './agency.entity';

@Injectable()
export class AgencyService {
    constructor(
        @InjectRepository(Agency)
        private readonly agencyRepository: Repository<Agency>,
    ) {}

    findAll(options?: FindManyOptions): Promise<Agency[]> {
        return this.agencyRepository.find(options);
    }
}
