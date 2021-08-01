import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { AgencyQuery } from '../infrastructure/queries/agency.query';
import { AgencyDetailsDto } from './dtos/agency-details.dto';

@Injectable()
export class AgencyV2Service {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<AgencyDetailsDto[] | GetManyDefaultResponse<AgencyDetailsDto>> {
        return this.agencyQuery.findManyAgencies(query);
    }

    findOne(query: CrudRequest): Promise<AgencyDetailsDto> {
        return this.agencyQuery.findOneAgency(query);
    }
}
