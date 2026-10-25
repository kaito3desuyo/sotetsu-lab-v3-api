import { BadRequestException } from '@nestjs/common';
import type { CalendarQuery } from '../infrastructure/queries/calendar.query.js';
import { CalendarV3Service } from './calendar.v3.service.js';

const calendar = {
    id: 'c1',
    serviceId: 's1',
    calendarName: '平日',
    monday: true,
    endDate: null,
};

describe('CalendarV3Service - fields', () => {
    const query = {
        findManyByServiceName: vi.fn(),
        findOneById: vi.fn(),
        findOneBySpecificDate: vi.fn(),
    };
    const service = new CalendarV3Service(query as unknown as CalendarQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findManyByServiceName.mockResolvedValue([calendar]);
        query.findOneById.mockResolvedValue(calendar);
        query.findOneBySpecificDate.mockResolvedValue(calendar);
    });

    it('一覧: 指定が無ければ今の応答をそのまま返す', async () => {
        const result = await service.findMany({ serviceName: '相鉄線' });

        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
        expect(result).toEqual([calendar]);
    });

    it('一覧: fields[calendar] の項目と id だけを返し、null は省く', async () => {
        const result = await service.findMany({
            fields: { calendar: 'calendarName,endDate' },
        });

        expect(result).toEqual([{ id: 'c1', calendarName: '平日' }]);
    });

    it('一覧: include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
    });

    it('一覧: 木に無い項目は 400', async () => {
        await expect(
            service.findMany({ fields: { calendar: 'password' } }),
        ).rejects.toThrow(
            new BadRequestException(
                'fields[calendar] に指定できない項目: password',
            ),
        );
    });

    it(':id: fields で削り、見つからなければ null のまま', async () => {
        await expect(
            service.findOne({ id: 'c1', fields: { calendar: 'monday' } }),
        ).resolves.toEqual({ id: 'c1', monday: true });

        query.findOneById.mockResolvedValue(null);
        await expect(
            service.findOne({ id: 'x', fields: { calendar: 'monday' } }),
        ).resolves.toBeNull();
        expect(query.findOneById).toHaveBeenLastCalledWith({ id: 'x' });
    });

    it('as/of: fields で削り、見つからなければ undefined のまま', async () => {
        await expect(
            service.findOneBySpecificDate({
                date: '2026-10-25',
                fields: { calendar: 'calendarName' },
            }),
        ).resolves.toEqual({ id: 'c1', calendarName: '平日' });

        query.findOneBySpecificDate.mockResolvedValue(undefined);
        await expect(
            service.findOneBySpecificDate({
                date: '2026-10-25',
                fields: { calendar: 'calendarName' },
            }),
        ).resolves.toBeUndefined();
        expect(query.findOneBySpecificDate).toHaveBeenLastCalledWith({
            date: '2026-10-25',
        });
    });
});
