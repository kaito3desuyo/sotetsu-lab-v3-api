import dayjs from 'dayjs';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { getBaseDate } from '../../../core/utils/datetime.js';

/** 目撃時刻がサーバーの時刻より先でも受け付ける幅（端末の時計の進みの分） */
const FUTURE_TOLERANCE_SECONDS = 60;

export function parseSightingTime(params: {
    agencyId: string;
    formationOrVehicleNumber: string;
    operationNumber: string;
    sightingTime: string;
}): {
    sightingTimeInstance: dayjs.Dayjs;
    sightingTimeInJst: dayjs.Dayjs;
    date: string;
} {
    const {
        agencyId,
        formationOrVehicleNumber,
        operationNumber,
        sightingTime,
    } = params;
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(sightingTime)) {
        throw new UseCaseError('目撃時刻の形式が正しくありません', {
            agencyId,
            formationOrVehicleNumber,
            operationNumber,
            sightingTime,
            reason: 'offset_missing',
        });
    }
    const requestedTime = dayjs.utc(sightingTime);
    if (!requestedTime.isValid()) {
        throw new UseCaseError('目撃時刻の形式が正しくありません', {
            agencyId,
            formationOrVehicleNumber,
            operationNumber,
            sightingTime,
            reason: 'invalid_datetime',
        });
    }
    // 「現在時刻」で送ると、端末の時計の進み（実測では 1 秒未満がほとんど）だけ未来になる。
    // 60 秒までは受け付け、受け付けた時刻に揃えて保存する
    const now = dayjs.utc();
    if (requestedTime.isAfter(now.add(FUTURE_TOLERANCE_SECONDS, 'second'))) {
        throw new UseCaseError('未来の時刻は指定できません', {
            agencyId,
            formationOrVehicleNumber,
            operationNumber,
            sightingTime,
            reason: 'future_datetime',
        });
    }
    const sightingTimeInstance = requestedTime.isAfter(now)
        ? now
        : requestedTime;
    const sightingTimeInJst = sightingTimeInstance.tz();
    const date = getBaseDate(sightingTimeInJst).format('YYYY-MM-DD');
    return { sightingTimeInstance, sightingTimeInJst, date };
}
