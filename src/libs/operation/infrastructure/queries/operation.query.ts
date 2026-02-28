import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import omit from 'just-omit';
import { isArray } from 'lodash';
import {
    FindManyOptions,
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Or,
    Repository,
} from 'typeorm';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationCurrentPositionDtoBuilder } from '../builders/operation-current-position.dto.builder';
import {
    OperationDtoBuilder,
    OperationsDtoBuilder,
    buildOperationDetailsDto,
} from '../builders/operation-dto.builder';
import { OperationModel } from '../models/operation.model';

@Injectable()
export class OperationQuery extends TypeOrmCrudService<OperationModel> {
    constructor(
        @InjectRepository(OperationModel)
        private readonly operationRepository: Repository<OperationModel>,
    ) {
        super(operationRepository);
    }

    async findMany(
        options?: FindManyOptions<OperationModel>,
    ): Promise<OperationDetailsDto[]> {
        const models = await this.operationRepository.find(options);
        return OperationsDtoBuilder.buildFromModel(models);
    }

    // =========================================================================

    async findManyOperations(
        query: CrudRequest,
    ): Promise<
        OperationDetailsDto[] | GetManyDefaultResponse<OperationDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildOperationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildOperationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<OperationDetailsDto[]> {
        const { calendarId } = params;

        const model = await this.operationRepository.find({
            where: { calendarId },
        });

        if (!model) {
            return null;
        }

        return OperationsDtoBuilder.toDetailsDto(model);
    }

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format);
        const endDate = dayjs(end, format);

        const result = await this.operationRepository.find({
            relations: ['calendar'],
            where: {
                calendar: {
                    startDate: Or(
                        LessThanOrEqual(endDate.format(format)),
                        IsNull(),
                    ),
                    endDate: Or(
                        MoreThanOrEqual(startDate.format(format)),
                        IsNull(),
                    ),
                },
            },
        });

        return OperationsDtoBuilder.buildFromModel(result);
    }

    async findOneOperation(query: CrudRequest): Promise<OperationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildOperationDetailsDto(model);
    }

    async findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto> {
        const { operationId, searchTime } = params;

        const model = await this.operationRepository.findOne({
            where: { id: operationId },
            relations: [
                'tripOperationLists',
                'tripOperationLists.trip',
                // 'tripOperationLists.trip.tripClass',
                'tripOperationLists.startTime',
                // 'tripOperationLists.startTime.station',
                'tripOperationLists.endTime',
                // 'tripOperationLists.endTime.station',
            ],
            order: {
                tripOperationLists: {
                    startTime: {
                        departureDays: 'ASC',
                        departureTime: 'ASC',
                    },
                    endTime: {
                        arrivalDays: 'ASC',
                        arrivalTime: 'ASC',
                    },
                },
            },
        });

        if (!model) {
            return null;
        }

        let prev = null;
        let current = null;
        let next = null;

        // 運用に紐づく列車情報が存在しない場合、現在位置はnullを返す
        if (!model.tripOperationLists.length) {
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const dateStr = searchTimeInstance.format('YYYY-MM-DD');
        const targetTimeInstance = (days: number, time: string) =>
            dayjs(`${dateStr} ${time}`, 'YYYY-MM-DD HH:mm:ss')
                .subtract(searchTimeInstance.hour() < 4 ? 1 : 0, 'day')
                .add(days - 1, 'day');

        // 検索日時が0番目の列車の発車時刻よりも前の場合
        if (
            searchTimeInstance <
            targetTimeInstance(
                model.tripOperationLists[0].startTime.departureDays,
                model.tripOperationLists[0].startTime.departureTime,
            )
        ) {
            next = model.tripOperationLists[0];
            return OperationCurrentPositionDtoBuilder.buildFromModel({
                operation: omit(model, ['tripOperationLists']),
                prev,
                current,
                next,
            });
        }

        // 検索日時が列車間の場合
        // n番目の列車の到着時刻 <= 検索日時 < n + 1番目の列車の出発時刻
        const nToNPlus1 = model.tripOperationLists.find((_, i, arr) => {
            if (!arr[i + 1]) {
                return undefined;
            }

            return (
                targetTimeInstance(
                    arr[i].endTime.arrivalDays,
                    arr[i].endTime.arrivalTime,
                ) <= searchTimeInstance &&
                searchTimeInstance <
                    targetTimeInstance(
                        arr[i + 1].startTime.departureDays,
                        arr[i + 1].startTime.departureTime,
                    )
            );
        });

        // n - 1番目の列車の到着時刻 <= 検索日時 < n番目の列車の出発時刻
        const nMinus1ToN = model.tripOperationLists.find((_, i, arr) => {
            if (!arr[i - 1]) {
                return undefined;
            }

            return (
                targetTimeInstance(
                    arr[i - 1].endTime.arrivalDays,
                    arr[i - 1].endTime.arrivalTime,
                ) <= searchTimeInstance &&
                searchTimeInstance <
                    targetTimeInstance(
                        arr[i].startTime.departureDays,
                        arr[i].startTime.departureTime,
                    )
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
        const currentRunning = model.tripOperationLists.find((item) => {
            return (
                targetTimeInstance(
                    item.startTime.departureDays,
                    item.startTime.departureTime,
                ) <= searchTimeInstance &&
                searchTimeInstance <
                    targetTimeInstance(
                        item.endTime.arrivalDays,
                        item.endTime.arrivalTime,
                    )
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
        if (
            targetTimeInstance(
                model.tripOperationLists.at(-1).endTime.arrivalDays,
                model.tripOperationLists.at(-1).endTime.arrivalTime,
            ) <= searchTimeInstance
        ) {
            prev = model.tripOperationLists.at(-1);
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
}
