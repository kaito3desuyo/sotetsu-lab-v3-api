import { secondsOfServiceDay } from './datetime.js';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};

describe('secondsOfServiceDay', () => {
    it('1 日目はそのまま、2 日目は 24 時間足す', () => {
        expect(secondsOfServiceDay(1, '08:22:00')).toBe(t('08:22'));
        expect(secondsOfServiceDay(2, '00:30:00')).toBe(86400 + t('00:30'));
    });
    it('時刻が無ければ null', () => {
        expect(secondsOfServiceDay(null, null)).toBeNull();
    });
});
