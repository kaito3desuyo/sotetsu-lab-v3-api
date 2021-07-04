import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import moment from 'moment';
import { Brackets, In, SelectQueryBuilder } from 'typeorm';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { Formation } from './formation.entity';
import { FormationService } from './formation.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class FormationController {
    constructor(
        private formationService: FormationService,
        private operationSightingService: OperationSightingService,
    ) {}

    @Get()
    async getFormations(): Promise<{ formations: Formation[] }> {
        const formations = await this.formationService.findAll({
            relations: ['vehicle_formations', 'vehicle_formations.vehicle'],
        });
        return { formations };
    }

    @Get('/search')
    async searchFormations(
        @Query()
        query: {
            agency_id?: string;
            formation_number?: string;
            vehicle_number?: string;
            date?: string;
            start_date?: string;
            end_date?: string;
        },
    ): Promise<{ formations: Formation[] }> {
        const formationQueryBuilder = this.formationService.createQueryBuilder(
            'formations',
        );
        let searchQuery: SelectQueryBuilder<Formation> = formationQueryBuilder;
        searchQuery = searchQuery.select('formations.id');

        if (query.agency_id) {
            searchQuery = searchAgencyId(query.agency_id, searchQuery);
        }

        if (query.formation_number) {
            searchQuery = searchFormationNumber(
                query.formation_number,
                searchQuery,
            );
        }

        if (query.vehicle_number) {
            searchQuery = searchVehicleNumber(
                query.vehicle_number,
                searchQuery,
            );
        }

        if (query.date) {
            searchQuery = searchDate(query.date, searchQuery);
        }

        if (query.start_date && query.end_date) {
            searchQuery = searchBetweenDate(
                query.start_date,
                query.end_date,
                searchQuery,
            );
        }

        const rawQuery = searchQuery.getQueryAndParameters();

        const formationIds = await this.formationService.query(
            rawQuery[0] +
                ' ORDER BY to_number("formations"."vehicle_type", \'999999999999\') ASC, to_number("formation_number", \'99999\') ASC',
            rawQuery[1],
        );

        if (!formationIds.length) {
            return {
                formations: [],
            };
        }

        const formations = await this.formationService.findAll({
            where: {
                id: In(formationIds.map((o) => o.formations_id)),
            },
        });

        return {
            formations: formationIds.map((o) =>
                formations.find(
                    (formation) => formation.id === o.formations_id,
                ),
            ),
        };
    }

    @Get('/search/numbers')
    async searchFormationNumbers(
        @Query() query: { date: string },
    ): Promise<Array<{ formation_number: string }>> {
        if (!query.date) {
            throw new HttpException(
                'Please set date query. example: 2019-01-01',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }
        if (!/\d{4}-\d{2}-\d{2}/.test(query.date)) {
            throw new HttpException(
                'Date query has invalid format. example: 2019-01-01',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        const numbers = await this.formationService.query(
            `
      SELECT vehicle_type, formation_number, agencies.agency_name
      FROM formations
      LEFT JOIN agencies ON formations.agency_id = agencies.id
      WHERE (start_date <= $1 OR start_date IS NULL) AND ($1 <= end_date OR end_date IS NULL)
      ORDER BY to_number("vehicle_type", '999999999999') ASC, to_number("formation_number", '99999') ASC
      `,
            [query.date],
        );

        return numbers;
    }

    @Get('/all/numbers')
    async getFormationsAllNumbers(@Query('date') date: string): Promise<any[]> {
        if (!date) {
            throw new HttpException(
                'Please set date query. example: 2019-01-01',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }
        if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
            throw new HttpException(
                'Date query has invalid format. example: 2019-01-01',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        const numbers = await this.formationService.query(
            `
      SELECT formation_number
      FROM formations
      WHERE (start_date <= $1 OR start_date IS NULL) AND ($1 <= end_date OR end_date IS NULL)
      ORDER BY to_number("formation_number", '99999') ASC
      `,
            [date],
        );

        return numbers;
    }

    @Get('/all/latest-sightings')
    async getFormationsAllLatestSightings(): Promise<any[]> {
        const subQuery = this.operationSightingService
            .createQueryBuilder('t_sightings')
            .select('"t_sightings".formation_id')
            .addSelect('MAX("t_sightings".sighting_time)', 'latest_sighting')
            .groupBy('formation_id');

        const latestSightings = await this.operationSightingService
            .createQueryBuilder('t_updates')
            .select('"t_updates".formation_id')
            .addSelect('jointable.latest_sighting')
            .addSelect('MAX("t_updates".updated_at)', 'latest_update')
            .innerJoin(
                '(' + subQuery.getQuery() + ')',
                'jointable',
                '"t_updates".formation_id = jointable.formation_id AND "t_updates".sighting_time = jointable.latest_sighting',
            )
            .groupBy('"t_updates".formation_id')
            .addGroupBy('"jointable".latest_sighting')
            .getRawMany();

        const latestSightingsDetail = await this.operationSightingService.findAll(
            {
                where: latestSightings.map((data) => {
                    return {
                        formation_id: data.formation_id,
                        sighting_time: data.latest_sighting,
                        updated_at: data.latest_update,
                    };
                }),
                relations: ['operation', 'formation'],
            },
        );

        return latestSightingsDetail;
    }
}

const searchAgencyId = (
    agencyId: string,
    qb: SelectQueryBuilder<Formation>,
) => {
    return qb.andWhere('agency_id = :agencyId', { agencyId });
};

const searchFormationNumber = (
    formationNumber: string,
    qb: SelectQueryBuilder<Formation>,
) => {
    return qb.andWhere('formation_number = :formationNumber', {
        formationNumber,
    });
};

const searchVehicleNumber = (
    vehicleNumber: string,
    qb: SelectQueryBuilder<Formation>,
) => {
    return qb
        .innerJoinAndSelect(
            'formations.vehicle_formations',
            'vehicle_formations',
        )
        .innerJoinAndSelect(
            'vehicle_formations.vehicle',
            'vehicle',
            'vehicle.vehicle_number = :vehicleNumber',
            { vehicleNumber },
        );
};

const searchDate = (date: string, qb: SelectQueryBuilder<Formation>) => {
    if (
        !/\d{4}-\d{2}-\d{2}/.test(date) ||
        !moment(date, 'YYYY-MM-DD').isValid()
    ) {
        throw new HttpException(
            'query `date` has invalid value. example: 2019-01-01',
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }

    return qb
        .andWhere(
            new Brackets((subqb) => {
                return subqb
                    .where('start_date <= :date', {
                        date,
                    })
                    .orWhere('start_date IS NULL');
            }),
        )
        .andWhere(
            new Brackets((subqb) => {
                return subqb
                    .where(':date <= end_date', {
                        date,
                    })
                    .orWhere('end_date IS NULL');
            }),
        );
};

const searchStartDate = (date: string, qb: SelectQueryBuilder<Formation>) => {
    if (
        !/\d{4}-\d{2}-\d{2}/.test(date) ||
        !moment(date, 'YYYY-MM-DD').isValid()
    ) {
        throw new HttpException(
            'query `date` has invalid value. example: 2019-01-01',
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }

    return qb.orWhere(
        new Brackets((subqb) => {
            return subqb
                .where('start_date <= :startDate', {
                    startDate: date,
                })
                .orWhere('start_date IS NULL');
        }),
    );
};

const searchEndDate = (date: string, qb: SelectQueryBuilder<Formation>) => {
    if (
        !/\d{4}-\d{2}-\d{2}/.test(date) ||
        !moment(date, 'YYYY-MM-DD').isValid()
    ) {
        throw new HttpException(
            'query `date` has invalid value. example: 2019-01-01',
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }

    return qb.orWhere(
        new Brackets((subqb) => {
            return subqb
                .where(':endDate <= end_date', {
                    endDate: date,
                })
                .orWhere('end_date IS NULL');
        }),
    );
};

const searchBetweenDate = (
    startDate: string,
    endDate: string,
    qb: SelectQueryBuilder<Formation>,
) => {
    if (
        !/\d{4}-\d{2}-\d{2}/.test(startDate) ||
        !moment(startDate, 'YYYY-MM-DD').isValid() ||
        !/\d{4}-\d{2}-\d{2}/.test(endDate) ||
        !moment(endDate, 'YYYY-MM-DD').isValid()
    ) {
        throw new HttpException(
            'query `start_date` or `end_date` has invalid value. example: 2019-01-01',
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }

    return qb
        .andWhere(
            new Brackets((subqb) => {
                return subqb
                    .where('start_date <= :startDate', {
                        startDate: endDate,
                    })
                    .orWhere('start_date IS NULL');
            }),
        )
        .andWhere(
            new Brackets((subqb) => {
                return subqb
                    .where(':endDate <= end_date', {
                        endDate: startDate,
                    })
                    .orWhere('end_date IS NULL');
            }),
        );
};
