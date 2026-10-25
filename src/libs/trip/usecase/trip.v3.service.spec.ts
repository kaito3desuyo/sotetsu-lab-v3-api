import { BadRequestException } from '@nestjs/common';
import type { TripQuery } from '../infrastructure/queries/trip.query.js';
import { TripV3Service } from './trip.v3.service.js';

describe('TripV3Service - 駅別の include・fields', () => {
    const query = {
        findManyByStationId: vi.fn().mockResolvedValue([]),
        findManyByStationIdWithSelection: vi.fn().mockResolvedValue([]),
    };
    const service = new TripV3Service(query as unknown as TripQuery);
    const params = { stationId: 'st1', calendarId: 'c1', tripDirection: 0 };

    beforeEach(() => vi.clearAllMocks());

    it('指定が無ければ今の取得', async () => {
        await service.findManyByStationId(params);
        expect(query.findManyByStationId).toHaveBeenCalledWith(params);
        expect(query.findManyByStationIdWithSelection).not.toHaveBeenCalled();
    });

    it('指定があれば選択の取得', async () => {
        await service.findManyByStationId({ ...params, include: '' });
        expect(query.findManyByStationIdWithSelection).toHaveBeenCalledWith(
            params,
            { paths: new Set(), fields: new Map() },
        );
    });

    it('崩れた指定は 400 で、query を呼ばない', async () => {
        await expect(
            service.findManyByStationId({ ...params, include: 'tripClass' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: tripClass'),
        );
        expect(query.findManyByStationId).not.toHaveBeenCalled();
        expect(query.findManyByStationIdWithSelection).not.toHaveBeenCalled();
    });
});
