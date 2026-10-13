import dayjs from 'dayjs';

export function getBaseDate(instance: dayjs.Dayjs): dayjs.Dayjs {
    return instance
        .subtract(instance.hour() < 4 ? 1 : 0, 'days')
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0);
}

/** times の (days, 'HH:mm:ss') を鉄道日の 0 時からの秒にする。days は 1 が当日 */
export function secondsOfServiceDay(days: number | null, time: string | null): number | null {
    if (!time) return null;
    const [h, m, s = 0] = time.split(':').map(Number);
    return ((days ?? 1) - 1) * 86400 + h * 3600 + m * 60 + s;
}
