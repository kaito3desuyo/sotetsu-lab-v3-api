import { Injectable } from '@nestjs/common';
import { AgencyQuery } from '../infrastructure/queries/agency.query.js';
import { AgencyDetailsDto } from './dtos/agency-details.dto.js';

@Injectable()
export class AgencyV3Service {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    findAll(): Promise<AgencyDetailsDto[]> {
        return this.agencyQuery.findAll();
    }
}
