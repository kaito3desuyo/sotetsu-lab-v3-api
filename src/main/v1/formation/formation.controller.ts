import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { FormationService } from './formation.service';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import moment from 'moment';
import { Formation } from './formation.entity';

@Controller()
export class FormationController {
  constructor(
    private formationService: FormationService,
    private operationSightingService: OperationSightingService,
  ) {}

  @Get()
  async getFormations(): Promise<Formation[]> {
    const formations = await this.formationService.findAll({
      relations: ['formation_to_vehicles', 'formation_to_vehicles.vehicle']
    });
    return formations
  }

  @Get('/search')
  async getFormationSearch(
    @Query('date') date: string,
    @Query('number') formationNumber: string,
  ): Promise<Formation[]> {
    if (!date && !formationNumber) {
      throw new HttpException(
        'Please set search query.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const formationQueryBuilder = this.formationService.createQueryBuilder();
    let searchQuery: SelectQueryBuilder<Formation> = formationQueryBuilder;
    if (formationNumber) {
      searchQuery = searchFormationNumber(formationNumber, searchQuery);
    }
    if (date) {
      searchQuery = searchDate(date, searchQuery);
    }

    const result = await searchQuery.getMany();

    return result;
  }

  @Get('/search/by-vehicle')
  async searchFormationByVehicleNumber(
    @Query('agency_id') agencyId: string,
    @Query('number') vehicleNumber: string,
    @Query('date') date: string,
  ): Promise<Formation[]> {
    try {
      if (!vehicleNumber) {
        throw new Error('Please set `number` query.');
      }
      const formationQueryBuilder = this.formationService.createQueryBuilder(
        'formation',
      );

      let searchQuery: SelectQueryBuilder<Formation> = formationQueryBuilder;

      if (agencyId) {
        searchQuery = searchAgencyId(agencyId, searchQuery);
      }
      if (date) {
        searchQuery = searchDate(date, searchQuery);
      }

      const formation = await searchQuery
        .innerJoinAndSelect('formation.formation_to_vehicles', 'vehicles')
        .innerJoinAndSelect(
          'vehicles.vehicle',
          'vehicle',
          'vehicle.vehicle_number = :vehicleNumber',
          { vehicleNumber },
        )
        .getMany();

      return formation;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
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
    const subQuery = await this.operationSightingService
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

    const latestSightingsDetail = await this.operationSightingService.findAll({
      where: latestSightings.map(data => {
        return {
          formation_id: data.formation_id,
          sighting_time: data.latest_sighting,
          updated_at: data.latest_update,
        };
      }),
      relations: ['operation', 'formation'],
    });

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
      new Brackets(subqb => {
        return subqb
          .where('start_date <= :date', {
            date,
          })
          .orWhere('start_date IS NULL');
      }),
    )
    .andWhere(
      new Brackets(subqb => {
        return subqb
          .where(':date <= end_date', {
            date,
          })
          .orWhere('end_date IS NULL');
      }),
    );
};
