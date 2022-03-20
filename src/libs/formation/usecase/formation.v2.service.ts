import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { merge, mergeWith } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/util/merge-customizer';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';
import { FormationFindManyBySpecificDateParam } from './params/formation-find-many-by-specific-date.param';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param';

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

    findManyBySpecificDate(
        query: CrudRequest,
        params: FormationFindManyBySpecificDateParam,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        return this.formationQuery.findManyFormations(
            mergeWith(
                {
                    parsed: {
                        search: {
                            $and: [
                                {
                                    $or: [
                                        {
                                            startDate: { $lte: params.date },
                                        },
                                        {
                                            startDate: null,
                                        },
                                    ],
                                },
                                {
                                    $or: [
                                        {
                                            endDate: { $gte: params.date },
                                        },
                                        {
                                            endDate: null,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );
    }

    async findManyBySpecificPeriod(
        query: CrudRequest,
        params: FormationFindManyBySpecificPeriodParam,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        return this.formationQuery.findManyFormations(
            mergeWith(
                {
                    parsed: {
                        search: {
                            $and: [
                                {
                                    $or: [
                                        {
                                            startDate: { $lte: params.endDate },
                                        },
                                        {
                                            startDate: null,
                                        },
                                    ],
                                },
                                {
                                    $or: [
                                        {
                                            endDate: { $gte: params.startDate },
                                        },
                                        {
                                            endDate: null,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );
    }

    findOne(query: CrudRequest): Promise<FormationDetailsDto> {
        return this.formationQuery.findOneFormation(query);
    }
}
