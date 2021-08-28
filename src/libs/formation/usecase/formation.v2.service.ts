import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';

@Injectable()
export class FormationV2Service {
    constructor(private readonly formationQuery: FormationQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        return this.formationQuery.findManyFormations(query);
    }

    findOne(query: CrudRequest): Promise<FormationDetailsDto> {
        return this.formationQuery.findOneFormation(query);
    }
}
