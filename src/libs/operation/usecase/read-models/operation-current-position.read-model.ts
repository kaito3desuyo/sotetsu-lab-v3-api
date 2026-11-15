import dayjs from 'dayjs';
import omit from 'just-omit';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { TripOperationListModel } from '../../../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationCurrentPositionDtoBuilder } from '../../infrastructure/builders/operation-current-position.dto.builder.js';
import { OperationModel } from '../../infrastructure/models/operation.model.js';
import { OperationCurrentPositionDto } from '../dtos/operation-current-position.dto.js';

/**
 * 運用の現在位置（検索時刻に対して、前の列車・走行中の列車・次の列車のどれか）を決める。
 * 入力は `tripOperationLists`（trip・startTime・endTime 付き、出発 → 到着の時刻順）を持つ運用の model。
 */
export function buildOperationCurrentPosition(
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
            throw new UnexpectedError('運用の列車に出発の時刻が結合できない', {
                tripOperationListId: item.id,
            });
        }
        return targetTimeInstance(
            item.startTime.departureDays,
            item.startTime.departureTime,
        );
    };
    const arrivalOf = (item: TripOperationListModel) => {
        if (!item.endTime) {
            throw new UnexpectedError('運用の列車に到着の時刻が結合できない', {
                tripOperationListId: item.id,
            });
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
