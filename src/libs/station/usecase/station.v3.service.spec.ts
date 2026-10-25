import { BadRequestException } from '@nestjs/common';
import type { StationQuery } from '../infrastructure/queries/station.query.js';
import { StationV3Service } from './station.v3.service.js';

describe('StationV3Service - fields', () => {
    const station = { id: 'st1', stationName: '二俣川', stationSubname: null };
    const query = { findAll: vi.fn() };
    const service = new StationV3Service(query as unknown as StationQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findAll.mockResolvedValue([station]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findAll()).resolves.toEqual([station]);
    });

    it('fields[station] の項目と id だけを返し、null は省く', async () => {
        await expect(
            service.findAll({
                fields: { station: 'stationName,stationSubname' },
            }),
        ).resolves.toEqual([{ id: 'st1', stationName: '二俣川' }]);
    });

    it('include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findAll({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findAll).not.toHaveBeenCalled();
    });
});
