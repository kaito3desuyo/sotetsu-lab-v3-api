import dayjs from 'dayjs';

export function getBaseDate(instance: dayjs.Dayjs): dayjs.Dayjs {
    return instance
        .subtract(instance.hour() < 4 ? 1 : 0, 'days')
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0);
}
