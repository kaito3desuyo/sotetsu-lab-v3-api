import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationDtoBuilder, StationsDtoBuilder } from '../builders/station.dto.builder';
import { StationModel } from '../models/station.model';

@Injectable()
export class StationQuery extends TypeOrmCrudService<StationModel> {
    constructor(
        @InjectRepository(StationModel)
        private readonly stationRepository: Repository<StationModel>,
    ) {
        super(stationRepository);
    }

    async findManyStations(
        query: CrudRequest,
    ): Promise<
        StationDetailsDto[] | GetManyDefaultResponse<StationDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return StationsDtoBuilder.buildFromModel(models);
        } else {
            const data = StationsDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneStation(query: CrudRequest): Promise<StationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return StationDtoBuilder.buildFromModel(model);
    }

    async findAll(): Promise<StationDetailsDto[]> {
        const models = await this.stationRepository
            .createQueryBuilder('station')
            .select('station')
            .getMany();
        return StationsDtoBuilder.buildFromModel(models);
    }
}
