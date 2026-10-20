import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import {
    FormationDtoBuilder,
    FormationsDtoBuilder,
} from '../builders/formation.dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable()
export class FormationQuery {
    constructor(
        @InjectRepository(FormationModel)
        private readonly formationRepository: Repository<FormationModel>,
    ) {}

    async findManyBySpecificDate(params: {
        date: string;
    }): Promise<FormationDetailsDto[]> {
        const { date } = params;

        const models = await this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoinAndSelect(
                'formation.vehicleFormations',
                'vehicleFormations',
            )
            .leftJoinAndSelect('vehicleFormations.vehicle', 'vehicle')
            .where(
                '(formation.start_date <= :date OR formation.start_date IS NULL)',
                { date },
            )
            .andWhere(
                '(formation.end_date >= :date OR formation.end_date IS NULL)',
                { date },
            )
            .orderBy(
                "to_number(formation.vehicle_type, '9999999999999999')",
                'ASC',
            )
            .addOrderBy(
                "to_number(formation.formation_number, '9999999999999999')",
                'ASC',
            )
            .getMany();

        return FormationsDtoBuilder.buildFromModel(models);
    }

    async findManyBySpecificPeriod(params: {
        startDate: string;
        endDate: string;
    }): Promise<FormationDetailsDto[]> {
        const { startDate, endDate } = params;

        const format = 'YYYY-MM-DD';
        const startDateInstance = dayjs(startDate, format);
        const endDateInstance = dayjs(endDate, format);

        const result = await this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoinAndSelect('formation.agency', 'agency')
            .where(
                '(formation.start_date <= :endDate OR formation.start_date IS NULL)',
                { endDate: endDateInstance.format(format) },
            )
            .andWhere(
                '(formation.end_date >= :startDate OR formation.end_date IS NULL)',
                { startDate: startDateInstance.format(format) },
            )
            // findManyBySpecificDate と揃える。orderBy 不在だと返却順が非決定的で
            // クライアント側の会社内並び順（東急・相鉄の一部）が崩れるため、
            // 系式→編成番号の数値順で安定化する。
            .orderBy(
                "to_number(formation.vehicle_type, '9999999999999999')",
                'ASC',
            )
            .addOrderBy(
                "to_number(formation.formation_number, '9999999999999999')",
                'ASC',
            )
            .getMany();

        return FormationsDtoBuilder.buildFromModel(result);
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
