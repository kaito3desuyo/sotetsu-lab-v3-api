import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { AgenciesDtoBuilder, AgencyDtoBuilder } from '../builders/agency.dto.builder';
import { AgencyModel } from '../models/agency.model';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';

@Injectable()
export class AgencyQuery extends TypeOrmCrudService<AgencyModel> {
    constructor(
        @InjectRepository(AgencyModel)
        private readonly agencyRepository: Repository<AgencyModel>,
    ) {
        super(agencyRepository);
    }

    async findManyAgencies(
        query: CrudRequest,
    ): Promise<AgencyDetailsDto[] | GetManyDefaultResponse<AgencyDetailsDto>> {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return AgenciesDtoBuilder.buildFromModel(models);
        } else {
            const data = AgenciesDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneAgency(query: CrudRequest): Promise<AgencyDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return AgencyDtoBuilder.buildFromModel(model);
    }

    async findAll(): Promise<AgencyDetailsDto[]> {
        const models = await this.agencyRepository
            .createQueryBuilder('agency')
            .select('agency')
            .getMany();
        return AgenciesDtoBuilder.buildFromModel(models);
    }
}
