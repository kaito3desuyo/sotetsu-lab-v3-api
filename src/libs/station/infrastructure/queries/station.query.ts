import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { buildStationDetailsDto } from '../builders/station-dto.builder';
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
            return models.map((o) => buildStationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildStationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneRoute(query: CrudRequest): Promise<StationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildStationDetailsDto(model);
    }
}
