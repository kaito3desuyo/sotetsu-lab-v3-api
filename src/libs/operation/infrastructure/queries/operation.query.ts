import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import omit from 'just-omit';
import { FindManyOptions, Repository } from 'typeorm';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto.js';
import { OperationWithTripsDto } from '../../usecase/dtos/operation-with-trips.dto.js';
import { OPERATION_WITH_TRIPS_SELECTION_TREE } from '../../usecase/operation-with-trips-selection.js';
import { OPERATIONS_BY_PERIOD_SELECTION_TREE } from '../../usecase/operations-by-period-selection.js';
import {
    OperationDtoBuilder,
    OperationsDtoBuilder,
} from '../builders/operation.dto.builder.js';
import { OperationModel } from '../models/operation.model.js';

@Injectable()
export class OperationQuery {
    constructor(
        @InjectRepository(OperationModel)
        private readonly operationRepository: Repository<OperationModel>,
    ) {}

    async findMany(
        options?: FindManyOptions<OperationModel>,
    ): Promise<OperationDetailsDto[]> {
        const models = await this.operationRepository.find(options);
        return OperationsDtoBuilder.buildFromModel(models);
    }

    // =========================================================================

    async findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<OperationDetailsDto[]> {
        const { calendarId } = params;

        const models = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .where('operation.calendar_id = :calendarId', { calendarId })
            .getMany();

        return OperationsDtoBuilder.buildFromModel(models);
    }

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format);
        const endDate = dayjs(end, format);

        const result = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .leftJoinAndSelect('operation.calendar', 'calendar')
            .where(
                '(calendar.start_date <= :endDate OR calendar.start_date IS NULL)',
                { endDate: endDate.format(format) },
            )
            .andWhere(
                '(calendar.end_date >= :startDate OR calendar.end_date IS NULL)',
                { startDate: startDate.format(format) },
            )
            .getMany();

        return OperationsDtoBuilder.buildFromModel(result);
    }

    /**
     * `findManyBySpecificPeriod` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyBySpecificPeriodWithSelection(
        params: { start: string; end: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { start, end } = params;
        const tree = OPERATIONS_BY_PERIOD_SELECTION_TREE;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format);
        const endDate = dayjs(end, format);

        const qb = this.operationRepository
            .createQueryBuilder('operation')
            .select(selectColumns('operation', tree, selection))
            // 期間の絞り込みに使うので、ダイヤを返さないときも結合だけはする
            .leftJoin('operation.calendar', 'calendar')
            .where(
                '(calendar.start_date <= :endDate OR calendar.start_date IS NULL)',
                { endDate: endDate.format(format) },
            )
            .andWhere(
                '(calendar.end_date >= :startDate OR calendar.end_date IS NULL)',
                { startDate: startDate.format(format) },
            );
        if (selection.paths.has('calendar')) {
            qb.addSelect(
                selectColumns('calendar', tree.relations.calendar, selection),
            );
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }

    /** 現在位置の計算に要る列車と始終着の時刻を結合し、出発 → 到着の時刻順に並べる。 */
    #currentPositionQueryBuilder() {
        return this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .leftJoinAndSelect(
                'operation.tripOperationLists',
                'tripOperationLists',
            )
            .leftJoinAndSelect('tripOperationLists.trip', 'trip')
            .leftJoinAndSelect('tripOperationLists.startTime', 'startTime')
            .leftJoinAndSelect('tripOperationLists.endTime', 'endTime')
            .orderBy('startTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('startTime.departureTime', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalTime', 'ASC', 'NULLS LAST');
    }

    /** 現在位置の判定に使う運用の model（`tripOperationLists` 付き）を 1 件引く。判定は read-model が行う。 */
    async findOneForCurrentPosition(params: {
        operationId: string;
    }): Promise<OperationModel | null> {
        const { operationId } = params;

        return this.#currentPositionQueryBuilder()
            .where('operation.id = :operationId', { operationId })
            .getOne();
    }

    /**
     * findOneForCurrentPosition の複数版（リアルタイム運用情報用）。運用は 1 回の問い合わせでまとめて引く。
     * 入力の順で返し、見つからない運用は省く。
     */
    async findManyForCurrentPosition(params: {
        operationIds: string[];
    }): Promise<OperationModel[]> {
        const { operationIds } = params;
        if (operationIds.length === 0) return [];

        const models = await this.#currentPositionQueryBuilder()
            .where('operation.id IN (:...operationIds)', { operationIds })
            .getMany();
        const byId = new Map(models.map((model) => [model.id, model]));

        return operationIds
            .map((operationId) => byId.get(operationId))
            .filter((model) => model !== undefined);
    }

    /**
     * 運用の id・運用のダイヤ（calendar_id）・つながる列車のダイヤの組を引く。共有キャッシュのタグ用。
     * 運用に列車が複数あれば、ダイヤの組ごとに行が分かれる（列車が無い、または列車のダイヤが null なら tripCalendarId は null）。
     * 見つからない運用の行は返らない（呼び出し側が運用の数の違いで気づく）。
     */
    async findCalendarIdByOperationIds(params: {
        operationIds: string[];
    }): Promise<
        {
            operationId: string;
            calendarId: string;
            tripCalendarId: string | null;
        }[]
    > {
        const { operationIds } = params;
        if (operationIds.length === 0) return [];

        return this.operationRepository
            .createQueryBuilder('operation')
            .select('operation.id', 'operationId')
            .addSelect('operation.calendarId', 'calendarId')
            .addSelect('trip.calendarId', 'tripCalendarId')
            .distinct(true)
            .leftJoin('operation.tripOperationLists', 'tripOperationList')
            .leftJoin('tripOperationList.trip', 'trip')
            .where('operation.id IN (:...operationIds)', { operationIds })
            .getRawMany<{
                operationId: string;
                calendarId: string;
                tripCalendarId: string | null;
            }>();
    }

    async findOneWithTrips(params: {
        operationId: string;
    }): Promise<OperationWithTripsDto | null> {
        const { operationId } = params;

        const model = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .leftJoinAndSelect('operation.calendar', 'calendar')
            .leftJoinAndSelect(
                'operation.tripOperationLists',
                'tripOperationLists',
            )
            .leftJoinAndSelect('tripOperationLists.trip', 'trip')
            .leftJoinAndSelect('trip.tripClass', 'tripClass')
            .leftJoinAndSelect('tripOperationLists.startTime', 'startTime')
            .leftJoinAndSelect('tripOperationLists.endTime', 'endTime')
            .where('operation.id = :operationId', { operationId })
            .orderBy('startTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('startTime.departureTime', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalTime', 'ASC', 'NULLS LAST')
            .getOne();

        if (!model) {
            return null;
        }

        const dto = OperationDtoBuilder.buildFromModel(model);

        return {
            operation: omit(dto, 'tripOperationLists') as OperationDetailsDto,
            trips: dto.tripOperationLists ?? [],
        };
    }

    /**
     * ダイヤ内の全運用を、列車つきで 1 回の SQL で返す（運用表用）。
     * 運用ごとに findOneWithTrips を呼ぶと、運用の数だけリクエストと SQL が走っていた。
     * 列車の並びは findOneWithTrips と同じ（出発 → 到着の時刻順）。
     */
    async findManyWithTrips(params: {
        calendarId: string;
    }): Promise<OperationWithTripsDto[]> {
        const { calendarId } = params;

        const models = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .leftJoinAndSelect('operation.calendar', 'calendar')
            .leftJoinAndSelect(
                'operation.tripOperationLists',
                'tripOperationLists',
            )
            .leftJoinAndSelect('tripOperationLists.trip', 'trip')
            .leftJoinAndSelect('trip.tripClass', 'tripClass')
            .leftJoinAndSelect('tripOperationLists.startTime', 'startTime')
            .leftJoinAndSelect('tripOperationLists.endTime', 'endTime')
            .where('operation.calendar_id = :calendarId', { calendarId })
            .orderBy('startTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('startTime.departureTime', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('endTime.arrivalTime', 'ASC', 'NULLS LAST')
            .getMany();

        return models.map((model) => {
            const dto = OperationDtoBuilder.buildFromModel(model);

            return {
                operation: omit(
                    dto,
                    'tripOperationLists',
                ) as OperationDetailsDto,
                trips: dto.tripOperationLists ?? [],
            };
        });
    }

    /**
     * `findManyWithTrips`・`findOneWithTrips` と同じ形で、`include`・`fields` で選んだ関連・列だけを返す
     * 問い合わせを組み立てる（docs/adr/0010-v3-include-and-fields.md）。区間の並びは返す列に関わらず時刻順のまま。
     */
    #withTripsSelectionQuery(selection: Selection) {
        const tree = OPERATION_WITH_TRIPS_SELECTION_TREE;
        const { operation, trips } = tree.relations;

        const qb = this.operationRepository
            .createQueryBuilder('operation')
            .select(selectColumns('operation', operation, selection));

        if (selection.paths.has('operation.calendar')) {
            qb.leftJoin('operation.calendar', 'calendar').addSelect(
                selectColumns(
                    'calendar',
                    operation.relations.calendar,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips')) {
            qb.leftJoin('operation.tripOperationLists', 'tripOperationLists')
                .addSelect(
                    selectColumns('tripOperationLists', trips, selection),
                )
                // 並べ替えに使うので、時刻を返さないときも結合だけはする
                .leftJoin('tripOperationLists.startTime', 'startTime')
                .leftJoin('tripOperationLists.endTime', 'endTime')
                .orderBy('startTime.departureDays', 'ASC', 'NULLS LAST')
                .addOrderBy('startTime.departureTime', 'ASC', 'NULLS LAST')
                .addOrderBy('endTime.arrivalDays', 'ASC', 'NULLS LAST')
                .addOrderBy('endTime.arrivalTime', 'ASC', 'NULLS LAST');

            if (selection.paths.has('trips.startTime')) {
                qb.addSelect(
                    selectColumns(
                        'startTime',
                        trips.relations.startTime,
                        selection,
                    ),
                );
            }
            if (selection.paths.has('trips.endTime')) {
                qb.addSelect(
                    selectColumns(
                        'endTime',
                        trips.relations.endTime,
                        selection,
                    ),
                );
            }
            if (selection.paths.has('trips.trip')) {
                qb.leftJoin('tripOperationLists.trip', 'trip').addSelect(
                    selectColumns('trip', trips.relations.trip, selection),
                );
            }
            if (selection.paths.has('trips.trip.tripClass')) {
                qb.leftJoin('trip.tripClass', 'tripClass').addSelect(
                    selectColumns(
                        'tripClass',
                        trips.relations.trip.relations.tripClass,
                        selection,
                    ),
                );
            }
        }

        return qb;
    }

    /**
     * `findManyWithTrips` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。区間の並びは返す列に関わらず時刻順のまま。
     */
    async findManyWithTripsWithSelection(
        params: { calendarId: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId } = params;

        const models = await this.#withTripsSelectionQuery(selection)
            .where('operation.calendar_id = :calendarId', { calendarId })
            .getMany();
        return models.map((model) =>
            serializeSelection(
                { operation: model, trips: model.tripOperationLists },
                OPERATION_WITH_TRIPS_SELECTION_TREE,
                selection,
            ),
        );
    }

    /** `findOneWithTrips` の選択の版（`findManyWithTripsWithSelection` と同じ形・並び） */
    async findOneWithTripsWithSelection(
        params: { operationId: string },
        selection: Selection,
    ): Promise<Record<string, unknown> | null> {
        const { operationId } = params;

        const model = await this.#withTripsSelectionQuery(selection)
            .where('operation.id = :operationId', { operationId })
            .getOne();
        if (!model) {
            return null;
        }
        return serializeSelection(
            { operation: model, trips: model.tripOperationLists },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
            selection,
        );
    }

    async findAllOperationNumbers(calendarId: string): Promise<string[]> {
        const data = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation.operation_number')
            .where('operation.calendar_id = :calendarId', { calendarId })
            .andWhere('operation.operation_number != :number', {
                number: '100',
            })
            .orderBy(
                "regexp_replace(operation.operation_number , '\\d', '', 'g')",
            )
            .addOrderBy('length(operation.operation_number)')
            .addOrderBy('operation.operation_number')
            .getRawMany<{ operation_number: string }>();

        return data.map((o) => o.operation_number);
    }

    async findOneByCalendarIdAndOperationNumber(params: {
        calendarId: string;
        operationNumber: string;
    }): Promise<OperationDetailsDto | null> {
        const { calendarId, operationNumber } = params;

        const model = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation')
            .where('operation.calendar_id = :calendarId', { calendarId })
            .andWhere('operation.operation_number = :operationNumber', {
                operationNumber,
            })
            .getOne();

        if (!model) {
            return null;
        }

        return OperationDtoBuilder.buildFromModel(model);
    }

    async findOneFirstDepartureTimeByOperationIdAndDate(params: {
        operationId: string;
        date: string;
    }): Promise<dayjs.Dayjs | null> {
        const { operationId, date } = params;

        const firstDeparture = await this.operationRepository
            .createQueryBuilder('operation')
            .select('startTime.departureDays', 'departureDays')
            .addSelect('startTime.departureTime', 'departureTime')
            .leftJoin('operation.tripOperationLists', 'tripOperationList')
            .leftJoin('tripOperationList.startTime', 'startTime')
            .where('operation.id = :operationId', { operationId })
            .andWhere('startTime.departureDays IS NOT NULL')
            .andWhere('startTime.departureTime IS NOT NULL')
            .orderBy('startTime.departureDays', 'ASC')
            .addOrderBy('startTime.departureTime', 'ASC')
            .limit(1)
            .getRawOne<{ departureDays: number; departureTime: string }>();

        if (!firstDeparture) {
            return null;
        }

        const dateTimeStr = `${date} ${firstDeparture.departureTime}`;
        const format = 'YYYY-MM-DD HH:mm:ss';

        if (!dayjs(dateTimeStr, format, true).isValid()) {
            return null;
        }

        return dayjs
            .tz(dateTimeStr, format, 'Asia/Tokyo')
            .add(Number(firstDeparture.departureDays) - 1, 'day');
    }
}
