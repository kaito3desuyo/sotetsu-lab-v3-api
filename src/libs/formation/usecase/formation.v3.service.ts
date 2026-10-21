import { Injectable } from '@nestjs/common';
import { FormationQuery } from '../infrastructure/queries/formation.query.js';
import { FormationDetailsDto } from './dtos/formation-details.dto.js';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param.js';

@Injectable()
export class FormationV3Service {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpecificDate(params: {
        date: string;
    }): Promise<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificDate(params);
    }

    findManyBySpecificPeriod(
        params: FormationFindManyBySpecificPeriodParam,
    ): Promise<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificPeriod(params);
    }
}
