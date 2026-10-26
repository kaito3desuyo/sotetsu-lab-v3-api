import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto.js';
import {
    FORMATIONS_AS_OF_SELECTION_TREE,
    FORMATIONS_BY_PERIOD_SELECTION_TREE,
} from '../../usecase/formation-selection.js';
import {
    FormationDtoBuilder,
    FormationsDtoBuilder,
} from '../builders/formation.dto.builder.js';
import { FormationModel } from '../models/formation.model.js';

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

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoinAndSelect(
                'formation.vehicleFormations',
                'vehicleFormations',
            )
            .leftJoinAndSelect('vehicleFormations.vehicle', 'vehicle');
        this.#whereActiveOn(qb, date);
        this.#orderByVehicleTypeAndNumber(qb);
        const models = await qb.getMany();

        return FormationsDtoBuilder.buildFromModel(models);
    }

    async findManyBySpecificPeriod(params: {
        startDate: string;
        endDate: string;
    }): Promise<FormationDetailsDto[]> {
        const { startDate, endDate } = params;

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoinAndSelect('formation.agency', 'agency');
        this.#whereActiveBetween(qb, startDate, endDate);
        this.#orderByVehicleTypeAndNumber(qb);
        const result = await qb.getMany();

        return FormationsDtoBuilder.buildFromModel(result);
    }

    /**
     * `findManyBySpecificDate` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyBySpecificDateWithSelection(
        params: { date: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { date } = params;
        const tree = FORMATIONS_AS_OF_SELECTION_TREE;
        const { vehicleFormations } = tree.relations;

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select(selectColumns('formation', tree, selection));
        this.#whereActiveOn(qb, date);
        this.#orderByVehicleTypeAndNumber(qb);
        if (selection.paths.has('vehicleFormations')) {
            qb.leftJoin(
                'formation.vehicleFormations',
                'vehicleFormations',
            ).addSelect(
                selectColumns(
                    'vehicleFormations',
                    vehicleFormations,
                    selection,
                ),
            );
        }
        if (selection.paths.has('vehicleFormations.vehicle')) {
            qb.leftJoin('vehicleFormations.vehicle', 'vehicle').addSelect(
                selectColumns(
                    'vehicle',
                    vehicleFormations.relations.vehicle,
                    selection,
                ),
            );
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }

    /**
     * `findManyBySpecificPeriod` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyBySpecificPeriodWithSelection(
        params: { startDate: string; endDate: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { startDate, endDate } = params;
        const tree = FORMATIONS_BY_PERIOD_SELECTION_TREE;

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select(selectColumns('formation', tree, selection));
        this.#whereActiveBetween(qb, startDate, endDate);
        this.#orderByVehicleTypeAndNumber(qb);
        if (selection.paths.has('agency')) {
            qb.leftJoin('formation.agency', 'agency').addSelect(
                selectColumns('agency', tree.relations.agency, selection),
            );
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }

    async findOneByAgencyIdAndFormationNumberAndDate(params: {
        agencyId: string;
        formationNumber: string;
        date: string;
    }): Promise<FormationDetailsDto | null> {
        const { agencyId, formationNumber, date } = params;

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .where('formation.agency_id = :agencyId', { agencyId })
            .andWhere('formation.formation_number = :formationNumber', {
                formationNumber,
            });
        this.#whereActiveOn(qb, date);
        const model = await qb.getOne();

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

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select('formation')
            .leftJoin('formation.vehicleFormations', 'vehicleFormation')
            .leftJoin('vehicleFormation.vehicle', 'vehicle')
            .where('formation.agency_id = :agencyId', { agencyId })
            .andWhere('vehicle.vehicle_number = :vehicleNumber', {
                vehicleNumber,
            });
        this.#whereActiveOn(qb, date);
        const model = await qb.getOne();

        if (!model) {
            return null;
        }

        return FormationDtoBuilder.buildFromModel(model);
    }

    /**
     * 指定日に在籍している編成だけに絞る（開始日・終了日が未設定なら無期限として扱う）。
     * 常に `andWhere` で足す。先頭で呼んでも `where` と同じ SQL になる（formation.query.sql.spec.ts）。
     */
    #whereActiveOn(
        qb: SelectQueryBuilder<FormationModel>,
        date: string,
    ): SelectQueryBuilder<FormationModel> {
        return qb
            .andWhere(
                '(formation.start_date <= :date OR formation.start_date IS NULL)',
                { date },
            )
            .andWhere(
                '(formation.end_date >= :date OR formation.end_date IS NULL)',
                { date },
            );
    }

    /**
     * 期間（両端を含む）のどこかで在籍している編成だけに絞る。日付は `YYYY-MM-DD` に整形して渡す。
     * 常に `andWhere` で足す（`#whereActiveOn` と同じ）。
     */
    #whereActiveBetween(
        qb: SelectQueryBuilder<FormationModel>,
        startDate: string,
        endDate: string,
    ): SelectQueryBuilder<FormationModel> {
        const format = 'YYYY-MM-DD';
        const startDateInstance = dayjs(startDate, format);
        const endDateInstance = dayjs(endDate, format);

        return qb
            .andWhere(
                '(formation.start_date <= :endDate OR formation.start_date IS NULL)',
                { endDate: endDateInstance.format(format) },
            )
            .andWhere(
                '(formation.end_date >= :startDate OR formation.end_date IS NULL)',
                { startDate: startDateInstance.format(format) },
            );
    }

    /**
     * 系式（vehicle_type）→編成番号の数値順に並べる。
     * orderBy 不在だと返却順が非決定的で、クライアント側の会社内並び順（東急・相鉄の一部）が崩れるため、
     * 一覧系の取得はすべてこの並びで安定化する。`orderBy` で始めるので、先に並びを指定していない前提。
     */
    #orderByVehicleTypeAndNumber(
        qb: SelectQueryBuilder<FormationModel>,
    ): SelectQueryBuilder<FormationModel> {
        return qb
            .orderBy(
                "to_number(formation.vehicle_type, '9999999999999999')",
                'ASC',
            )
            .addOrderBy(
                "to_number(formation.formation_number, '9999999999999999')",
                'ASC',
            );
    }
}
