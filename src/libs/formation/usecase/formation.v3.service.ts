import { Injectable } from '@nestjs/common';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param';

@Injectable()
export class FormationV3Service {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpecificPeriod(
        params: FormationFindManyBySpecificPeriodParam,
    ): Promise<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificPeriod(params);
    }
}
