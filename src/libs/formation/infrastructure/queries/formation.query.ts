import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray } from 'lodash';
import {
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Or,
    Repository,
} from 'typeorm';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import {
    buildFormationDetailsDto,
    FormationDtoBuilder,
} from '../builders/formation-dto.builder';
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

    async findManyBySpecificPeriod(params: {
        startDate: string;
        endDate: string;
    }): Promise<FormationDetailsDto[]> {
        const { startDate, endDate } = params;

        const format = 'YYYY-MM-DD';
        const startDateInstance = dayjs(startDate, format);
        const endDateInstance = dayjs(endDate, format);

        const result = await this.formationRepository.find({
            where: {
                startDate: Or(
                    LessThanOrEqual(endDateInstance.format(format)),
                    IsNull(),
                ),
                endDate: Or(
                    MoreThanOrEqual(startDateInstance.format(format)),
                    IsNull(),
                ),
            },
            relations: ['agency'],
        });

        return result.map((model) => FormationDtoBuilder.buildFromModel(model));
    }

    async findOneFormation(query: CrudRequest): Promise<FormationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildFormationDetailsDto(model);
    }

    async findOneByAgencyIdAndFormationNumberAndDate(params: {
        agencyId: string;
        formationNumber: string;
        date: string;
    }): Promise<FormationDetailsDto | null> {
        const { agencyId, formationNumber, date } = params;

        const model = await this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .where('formation.agency_id = :agencyId', { agencyId })
            .andWhere('formation.formation_number = :formationNumber', {
                formationNumber,
            })
            .andWhere(
                '(formation.start_date <= :date OR formation.start_date IS NULL)',
                {
                    date,
                },
            )
            .andWhere(
                '(formation.end_date >= :date OR formation.end_date IS NULL)',
                {
                    date,
                },
            )
            .getOne();

        if (!model) {
            return null;
        }

        return FormationDtoBuilder.buildFromModel(model);
    }

    async findOneByAgencyIdAndVehicleNumberAndDate(params: {
        agencyId: string;
        vehicleNumber: string;
        date: string;
    }): Promise<FormationDetailsDto | null> {
        const { agencyId, vehicleNumber, date } = params;

        const model = await this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoin('formation.vehicleFormations', 'vehicleFormation')
            .leftJoin('vehicleFormation.vehicle', 'vehicle')
            .where('formation.agency_id = :agencyId', { agencyId })
            .andWhere('vehicle.vehicle_number = :vehicleNumber', {
                vehicleNumber,
            })
            .andWhere(
                '(formation.start_date <= :date OR formation.start_date IS NULL)',
                {
                    date,
                },
            )
            .andWhere(
                '(formation.end_date >= :date OR formation.end_date IS NULL)',
                {
                    date,
                },
            )
            .getOne();

        if (!model) {
            return null;
        }

        return FormationDtoBuilder.buildFromModel(model);
    }
}
