import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { buildAgencyDetailsDto } from '../builders/agency-dto.builder';
import { AgencyModel } from '../models/agency.model';

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
            return models.map((o) => buildAgencyDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildAgencyDetailsDto(o));
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

        return buildAgencyDetailsDto(model);
    }
}
