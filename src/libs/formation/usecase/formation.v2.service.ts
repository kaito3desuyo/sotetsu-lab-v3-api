import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { merge } from 'lodash';
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
            merge(query, {
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
            }),
        );
    }

    async findManyBySpecificPeriod(
        query: CrudRequest,
        params: FormationFindManyBySpecificPeriodParam,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        return this.formationQuery.findManyFormations(
            merge(query, {
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
            }),
        );
    }

    findOne(query: CrudRequest): Promise<FormationDetailsDto> {
        return this.formationQuery.findOneFormation(query);
    }
}
