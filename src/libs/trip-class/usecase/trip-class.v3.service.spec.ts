import { BadRequestException } from '@nestjs/common';
import type { TripClassQuery } from '../infrastructure/queries/trip-class.query.js';
import { TripClassV3Service } from './trip-class.v3.service.js';

describe('TripClassV3Service - fields', () => {
    const tripClass = { id: 'k1', tripClassName: '各停', sequence: 1 };
    const query = { findMany: vi.fn() };
    const service = new TripClassV3Service(query as unknown as TripClassQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findMany.mockResolvedValue([tripClass]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findMany({ serviceId: 's1' })).resolves.toEqual([
            tripClass,
        ]);
        expect(query.findMany).toHaveBeenCalledWith({ serviceId: 's1' });
    });

    it('fields[tripClass] の項目と id だけを返す', async () => {
        await expect(
            service.findMany({ fields: { tripClass: 'tripClassName' } }),
        ).resolves.toEqual([{ id: 'k1', tripClassName: '各停' }]);
    });

    it('include は 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: 'service' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findMany).not.toHaveBeenCalled();
    });
});
