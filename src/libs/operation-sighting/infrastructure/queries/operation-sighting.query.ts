import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { FormationModel } from '../../../formation/infrastructure/models/formation.model.js';
import { OperationModel } from '../../../operation/infrastructure/models/operation.model.js';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto.js';
import {
    OperationSightingDtoBuilder,
    OperationSightingsDtoBuilder,
} from '../builders/operation-sighting.dto.builder.js';
import { OperationSightingInvalidationModel } from '../models/operation-sighting-invalidation.model.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';

@Injectable()
export class OperationSightingQuery {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
    ) {}

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
    }): Promise<OperationSightingDetailsDto[]> {
        const { start, end, includeInvalidated = false } = params;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format)
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0);
        const endDate = dayjs(end, format)
            .add(1, 'day')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0);

        let qb = this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.invalidations', 'invalidations')
            .leftJoinAndSelect('sighting.managementLogs', 'managementLogs')
            .where('sighting.sightingTime BETWEEN :start AND :end', {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            })
            .orderBy('sighting.sightingTime', 'ASC');

        if (!includeInvalidated) {
            qb = qb.andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            });
        }

        const model = await qb.getMany();

        return OperationSightingsDtoBuilder.buildFromModel(model);
    }

    /**
     * 期間内の目撃を、運用・編成・無効化つきで新しい順に（目撃の引き継ぎ用）。
     * 既定は有効な目撃だけ。includeInvalidated なら無効化された目撃も含める（過去の運用で無効化も表示するとき）
     */
    async findManyBySightingTimeRange(params: {
        start: dayjs.Dayjs;
        end: dayjs.Dayjs;
        includeInvalidated?: boolean;
    }): Promise<OperationSightingDetailsDto[]> {
        let qb = this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')
            .leftJoinAndSelect('sighting.invalidations', 'invalidations')
            .where('sighting.sightingTime BETWEEN :start AND :end', {
                start: params.start.toISOString(),
                end: params.end.toISOString(),
            });
        if (!params.includeInvalidated) {
            qb = qb.andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            });
        }
        const models = await qb
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .getMany();

        return OperationSightingsDtoBuilder.buildFromModel(models);
    }

    async findOneById(params: {
        id: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const model = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.invalidations', 'invalidations')
            .leftJoinAndSelect('sighting.managementLogs', 'managementLogs')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')
            .where('sighting.id = :id', { id: params.id })
            .getOne();

        if (!model) {
            return null;
        }

        return OperationSightingDtoBuilder.buildFromModel(model);
    }

    async findOneLatestByOperationNumber(params: {
        operationNumber: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByOperationNumberAndBeforeSightingTime(params: {
        operationNumber: string;
        sightingTime: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber, sightingTime } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere('sighting.sightingTime <= :sightingTime', {
                sightingTime: sightingTime.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    /**
     * findOneLatestByOperationNumberAndBeforeSightingTime の複数版（時刻断面をまとめて返す口用）。
     * 運用番号ごとの最新の有効な目撃を 1 回の問い合わせ（DISTINCT ON）で取る。キーは運用番号。
     */
    async findManyLatestByOperationNumbersAndBeforeSightingTime(params: {
        operationNumbers: string[];
        sightingTime: dayjs.Dayjs;
    }): Promise<Map<string, OperationSightingDetailsDto>> {
        return this.#findManyLatestBeforeSightingTime(
            'operation.operationNumber',
            params.operationNumbers,
            params.sightingTime,
            (model) => model.operation?.operationNumber,
        );
    }

    /** findOneLatestByFormationNumberAndBeforeSightingTime の複数版。キーは編成番号。 */
    async findManyLatestByFormationNumbersAndBeforeSightingTime(params: {
        formationNumbers: string[];
        sightingTime: dayjs.Dayjs;
    }): Promise<Map<string, OperationSightingDetailsDto>> {
        return this.#findManyLatestBeforeSightingTime(
            'formation.formationNumber',
            params.formationNumbers,
            params.sightingTime,
            (model) => model.formation?.formationNumber,
        );
    }

    /**
     * 番号ごとに「その時刻以前の最新の有効な目撃」を 1 回の問い合わせで引く。
     * 番号から運用・編成の行を先に引き、行ごとに (operation_id|formation_id, sighting_time) の索引で
     * 最新を 1 件取って、その中の最新を選ぶ。存在しない番号は行が無いので目撃を読まない
     * （時刻の索引をたどる形だと全件を読んで遅かった）。
     */
    async #findManyLatestBeforeSightingTime(
        keyColumn: 'operation.operationNumber' | 'formation.formationNumber',
        keys: string[],
        sightingTime: dayjs.Dayjs,
        keyOf: (model: OperationSightingModel) => string | undefined,
    ): Promise<Map<string, OperationSightingDetailsDto>> {
        const result = new Map<string, OperationSightingDetailsDto>();
        if (keys.length === 0) return result;

        const dataSource = this.operationSightingRepository.manager.dataSource;
        const sightings = this.operationSightingRepository.metadata.tableName;
        const invalidations = dataSource.getMetadata(OperationSightingInvalidationModel).tableName;
        const [joinTable, joinColumn, numberColumn] =
            keyColumn === 'operation.operationNumber'
                ? [dataSource.getMetadata(OperationModel).tableName, 'operation_id', 'operation_number']
                : [dataSource.getMetadata(FormationModel).tableName, 'formation_id', 'formation_number'];

        const rows: { id: string }[] = await this.operationSightingRepository.query(
            `SELECT latest.id
               FROM unnest($1::text[]) AS k(key)
               CROSS JOIN LATERAL (
                   SELECT c.id
                     FROM "${joinTable}" j
                     CROSS JOIN LATERAL (
                         SELECT s.id, s.sighting_time, s.updated_at
                           FROM "${sightings}" s
                          WHERE s.${joinColumn} = j.id
                            AND s.sighting_time <= $2
                            AND NOT EXISTS (
                                SELECT 1 FROM "${invalidations}" inv WHERE inv.operation_sighting_id = s.id
                            )
                          ORDER BY s.sighting_time DESC, s.updated_at DESC
                          LIMIT 1
                     ) c
                    WHERE j.${numberColumn} = k.key
                    ORDER BY c.sighting_time DESC, c.updated_at DESC
                    LIMIT 1
               ) latest`,
            [keys, sightingTime.toISOString()],
        );
        if (rows.length === 0) return result;

        const models = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')
            .where('sighting.id IN (:...ids)', { ids: rows.map((row) => row.id) })
            .getMany();
        for (const model of models) {
            const key = keyOf(model);
            if (key !== undefined && !result.has(key)) {
                result.set(key, OperationSightingDtoBuilder.buildFromModel(model));
            }
        }
        return result;
    }

    async findOneLatestByOperationNumberAndSightingTimeRange(params: {
        operationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { operationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('operation.operationNumber = :operationNumber', {
                operationNumber,
            })
            .andWhere('sighting.sightingTime BETWEEN :start AND :end', {
                start: sightingTimeStart.toISOString(),
                end: sightingTimeEnd.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumber(params: {
        formationNumber: string;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumberAndBeforeSightingTime(params: {
        formationNumber: string;
        sightingTime: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber, sightingTime } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere('sighting.sightingTime <= :sightingTime', {
                sightingTime: sightingTime.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findOneLatestByFormationNumberAndSightingTimeRange(params: {
        formationNumber: string;
        sightingTimeStart: dayjs.Dayjs;
        sightingTimeEnd: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto | null> {
        const { formationNumber, sightingTimeStart, sightingTimeEnd } = params;

        const result = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')

            .where('formation.formationNumber = :formationNumber', {
                formationNumber,
            })
            .andWhere('sighting.sightingTime BETWEEN :start AND :end', {
                start: sightingTimeStart.toISOString(),
                end: sightingTimeEnd.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .limit(1)
            .getOne();

        if (!result) return null;

        return OperationSightingDtoBuilder.buildFromModel(result);
    }

    async findManyLatestPerFormation(): Promise<OperationSightingDetailsDto[]> {
        const models = await this.operationSightingRepository
            .createQueryBuilder('s')
            .distinctOn(['"formation"."formation_number"'])
            .innerJoinAndSelect('s.operation', 'operation')
            .innerJoinAndSelect('s.formation', 'formation')
            .where((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = s.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('"formation"."formation_number"')
            .addOrderBy('"s"."sighting_time"', 'DESC')
            .addOrderBy('"s"."updated_at"', 'DESC')
            .getMany();

        return OperationSightingsDtoBuilder.buildFromModel(models);
    }
}
