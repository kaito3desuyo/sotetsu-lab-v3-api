import { Injectable } from '@nestjs/common';
import { AgencyQuery } from '../infrastructure/queries/agency.query';
import { AgencyDetailsDto } from './dtos/agency-details.dto';

@Injectable()
export class AgencyV3Service {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    findAll(): Promise<AgencyDetailsDto[]> {
        return this.agencyQuery.findAll();
    }
}
