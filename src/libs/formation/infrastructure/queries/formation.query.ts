import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Brackets, Repository } from 'typeorm';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationFindManyBySpecificDateParam } from '../../usecase/params/formation-find-many-by-specific-date.param';
import { FormationFindManyBySpecificPeriodParam } from '../../usecase/params/formation-find-many-by-specific-period.param';
import { buildFormationDetailsDto } from '../builders/formation-dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable()
export class FormationQuery extends TypeOrmCrudService<FormationModel> {
    constructor(
        @InjectRepository(FormationModel)
        private readonly formationRepository: Repository<FormationModel>,
    ) {
        super(formationRepository);
    }

    async findManyFormations(
        query: CrudRequest,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        // const models = await this.getMany(query);
        // TODO: もうちょっとどうにかしたい
        const qb = await this.createBuilder(query.parsed, query.options, true);
        const customQb = qb
            .addOrderBy(
                'to_number("vehicle_type", \'9999999999999999\')',
                'ASC',
            )
            .addOrderBy(
                'to_number("formation_number", \'9999999999999999\')',
                'ASC',
            );

        const models = await this.doGetMany(
            customQb,
            query.parsed,
            query.options,
        );

        if (isArray(models)) {
            return models.map((o) => buildFormationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildFormationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findManyFormationsBySpecificDate(
        query: CrudRequest,
        params: FormationFindManyBySpecificDateParam,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        const qb = await this.createBuilder(query.parsed, query.options, true);
        const customQb = (query.parsed.filter.length === 0
            ? qb.where(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.date,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
            : qb.andWhere(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.date,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
        )
            .andWhere(
                new Brackets((subqb) => {
                    return subqb
                        .where(':endDate <= end_date', {
                            endDate: params.date,
                        })
                        .orWhere('end_date IS NULL');
                }),
            )
            .addOrderBy(
                'to_number("vehicle_type", \'9999999999999999\')',
                'ASC',
            )
            .addOrderBy(
                'to_number("formation_number", \'9999999999999999\')',
                'ASC',
            );

        const models = await this.doGetMany(
            customQb,
            query.parsed,
            query.options,
        );

        if (isArray(models)) {
            return models.map((o) => buildFormationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildFormationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findManyFormationsBySpecificPeriod(
        query: CrudRequest,
        params: FormationFindManyBySpecificPeriodParam,
    ): Promise<
        FormationDetailsDto[] | GetManyDefaultResponse<FormationDetailsDto>
    > {
        const qb = await this.createBuilder(query.parsed, query.options, true);
        const customQb = (query.parsed.filter.length === 0
            ? qb.where(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.endDate,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
            : qb.andWhere(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.endDate,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
        )
            .andWhere(
                new Brackets((subqb) => {
                    return subqb
                        .where(':endDate <= end_date', {
                            endDate: params.startDate,
                        })
                        .orWhere('end_date IS NULL');
                }),
            )
            .addOrderBy(
                'to_number("vehicle_type", \'9999999999999999\')',
                'ASC',
            )
            .addOrderBy(
                'to_number("formation_number", \'9999999999999999\')',
                'ASC',
            );

        const models = await this.doGetMany(
            customQb,
            query.parsed,
            query.options,
        );

        if (isArray(models)) {
            return models.map((o) => buildFormationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildFormationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneFormation(query: CrudRequest): Promise<FormationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildFormationDetailsDto(model);
    }
}
