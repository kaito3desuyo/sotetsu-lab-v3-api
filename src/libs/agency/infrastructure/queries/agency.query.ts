import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgenciesDtoBuilder } from '../builders/agency.dto.builder.js';
import { AgencyModel } from '../models/agency.model.js';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto.js';

@Injectable()
export class AgencyQuery {
    constructor(
        @InjectRepository(AgencyModel)
        private readonly agencyRepository: Repository<AgencyModel>,
    ) {}

    async findAll(): Promise<AgencyDetailsDto[]> {
        const models = await this.agencyRepository
            .createQueryBuilder('agency')
            .select('agency')
            .getMany();
        return AgenciesDtoBuilder.buildFromModel(models);
    }
}
