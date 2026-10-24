import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import omit from 'just-omit';
import { FindManyOptions, Repository } from 'typeorm';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { TripOperationListModel } from '../../../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto.js';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto.js';
import { OperationWithTripsDto } from '../../usecase/dtos/operation-with-trips.dto.js';
import { OPERATION_WITH_TRIPS_SELECTION_TREE } from '../../usecase/operation-with-trips-selection.js';
import { OperationCurrentPositionDtoBuilder } from '../builders/operation-current-position.dto.builder.js';
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

    async findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto | null> {
        const { operationId, searchTime } = params;

        const model = await this.#currentPositionQueryBuilder()
            .where('operation.id = :operationId', { operationId })
            .getOne();

        if (!model) {
            return null;
        }

        return this.#toCurrentPosition(model, searchTime);
    }

    /**
     * findOneWithCurrentPosition の複数版（リアルタイム運用情報用）。運用は 1 回の問い合わせでまとめて引き、
     * 位置の計算は 1 件ずつの口と同じ。入力の順で返し、見つからない運用は省く。
     */
    async findManyWithCurrentPosition(params: {
        operationIds: string[];
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto[]> {
        const { operationIds, searchTime } = params;
        if (operationIds.length === 0) return [];

        const models = await this.#currentPositionQueryBuilder()
            .where('operation.id IN (:...operationIds)', { operationIds })
            .getMany();
        const byId = new Map(models.map((model) => [model.id, model]));

        return operationIds
            .map((operationId) => byId.get(operationId))
            .filter((model) => model !== undefined)
            .map((model) => this.#toCurrentPosition(model, searchTime));
    }

    #toCurrentPosition(
        model: OperationModel,
        searchTime: string | undefined,
    ): OperationCurrentPositionDto {
        let prev: TripOperationListModel | null = null;
        let current: TripOperationListModel | null = null;
        let next: TripOperationListModel | null = null;
        // leftJoinAndSelect しているので、列車が無くても空の配列が入る
        const tripOperationLists = model.tripOperationLists!;

        // 運用に紐づく列車情報が存在しない場合、現在位置はnullを返す
        if (!tripOperationLists.length) {
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const dateStr = searchTimeInstance.format('YYYY-MM-DD');
        // 日数・時刻が null の列は、日数を 0 として扱い、時刻は不正な日時になる（比較はどれも成り立たない）
        const targetTimeInstance = (days: number | null, time: string | null) =>
            dayjs(`${dateStr} ${time}`, 'YYYY-MM-DD HH:mm:ss')
                .subtract(searchTimeInstance.hour() < 4 ? 1 : 0, 'day')
                .add((days ?? 0) - 1, 'day');
        const departureOf = (item: TripOperationListModel) => {
            if (!item.startTime) {
                throw new UnexpectedError(
                    '運用の列車に出発の時刻が結合できない',
                    { tripOperationListId: item.id },
                );
            }
            return targetTimeInstance(
                item.startTime.departureDays,
                item.startTime.departureTime,
            );
        };
        const arrivalOf = (item: TripOperationListModel) => {
            if (!item.endTime) {
                throw new UnexpectedError(
                    '運用の列車に到着の時刻が結合できない',
                    { tripOperationListId: item.id },
                );
            }
            return targetTimeInstance(
                item.endTime.arrivalDays,
                item.endTime.arrivalTime,
            );
        };

        // 検索日時が0番目の列車の発車時刻よりも前の場合
        if (searchTimeInstance < departureOf(tripOperationLists[0])) {
            next = tripOperationLists[0];
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        // 検索日時が列車間の場合
        // n番目の列車の到着時刻 <= 検索日時 < n + 1番目の列車の出発時刻
        const nToNPlus1 = tripOperationLists.find((_, i, arr) => {
            if (!arr[i + 1]) {
                return undefined;
            }

            return (
                arrivalOf(arr[i]) <= searchTimeInstance &&
                searchTimeInstance < departureOf(arr[i + 1])
            );
        });

        // n - 1番目の列車の到着時刻 <= 検索日時 < n番目の列車の出発時刻
        const nMinus1ToN = tripOperationLists.find((_, i, arr) => {
            if (!arr[i - 1]) {
                return undefined;
            }

            return (
                arrivalOf(arr[i - 1]) <= searchTimeInstance &&
                searchTimeInstance < departureOf(arr[i])
            );
        });

        if (nToNPlus1 && nMinus1ToN) {
            prev = nToNPlus1;
            next = nMinus1ToN;
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        // 検索日時が列車運転中の場合
        // n番目の列車の出発時刻 <= 検索日時 < n番目の列車の到着時刻
        const currentRunning = tripOperationLists.find((item) => {
            return (
                departureOf(item) <= searchTimeInstance &&
                searchTimeInstance < arrivalOf(item)
            );
        });

        if (currentRunning) {
            current = currentRunning;
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        // 検索日時が最終列車の到着時刻よりも後の場合
        const last = tripOperationLists[tripOperationLists.length - 1];
        if (arrivalOf(last) <= searchTimeInstance) {
            prev = last;
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        return OperationCurrentPositionDtoBuilder.buildFromModel({
            operation: omit(model, ['tripOperationLists']),
            prev,
            current,
            next,
        });
    }

    async findOneWithTrips(params: { operationId: string }): Promise<OperationWithTripsDto | null> {
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
     * `findManyWithTrips` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。区間の並びは返す列に関わらず時刻順のまま。
     */
    async findManyWithTripsWithSelection(
        params: { calendarId: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId } = params;
        const tree = OPERATION_WITH_TRIPS_SELECTION_TREE;
        const { operation, trips } = tree.relations;

        const qb = this.operationRepository
            .createQueryBuilder('operation')
            .select(selectColumns('operation', operation, selection))
            .where('operation.calendar_id = :calendarId', { calendarId });

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

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(
                { operation: model, trips: model.tripOperationLists },
                tree,
                selection,
            ),
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
