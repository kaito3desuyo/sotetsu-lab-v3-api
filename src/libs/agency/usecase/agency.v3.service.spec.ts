import { BadRequestException } from '@nestjs/common';
import type { AgencyQuery } from '../infrastructure/queries/agency.query.js';
import { AgencyV3Service } from './agency.v3.service.js';

describe('AgencyV3Service - fields', () => {
    const agency = { id: 'a1', agencyName: '相鉄', agencyUrl: null };
    const query = { findAll: vi.fn() };
    const service = new AgencyV3Service(query as unknown as AgencyQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findAll.mockResolvedValue([agency]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findAll()).resolves.toEqual([agency]);
    });

    it('fields[agency] の項目と id だけを返す', async () => {
        await expect(
            service.findAll({ fields: { agency: 'agencyName,agencyUrl' } }),
        ).resolves.toEqual([{ id: 'a1', agencyName: '相鉄' }]);
    });

    it('include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findAll({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findAll).not.toHaveBeenCalled();
    });
});
