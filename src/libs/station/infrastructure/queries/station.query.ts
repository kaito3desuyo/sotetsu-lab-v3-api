import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationsDtoBuilder } from '../builders/station.dto.builder';
import { StationModel } from '../models/station.model';

@Injectable()
export class StationQuery {
    constructor(
        @InjectRepository(StationModel)
        private readonly stationRepository: Repository<StationModel>,
    ) {}

    async findAll(): Promise<StationDetailsDto[]> {
        const models = await this.stationRepository
            .createQueryBuilder('station')
            .select('station')
            .getMany();
        return StationsDtoBuilder.buildFromModel(models);
    }
}
