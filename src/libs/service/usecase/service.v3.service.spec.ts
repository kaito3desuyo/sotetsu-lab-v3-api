import type { MockedFunction } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceQuery } from '../infrastructure/queries/service.query.js';
import { ServiceStationsDto } from './dtos/service-stations.dto.js';
import { ServiceV3Service } from './service.v3.service.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockServiceQuery = {
    findOneStationsForService: vi.fn() as AnyMock,
    findOneStationsForServiceWithSelection: vi.fn() as AnyMock,
};

async function buildService(): Promise<ServiceV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ServiceV3Service,
            { provide: ServiceQuery, useValue: mockServiceQuery },
        ],
    }).compile();

    return module.get<ServiceV3Service>(ServiceV3Service);
}

describe('ServiceV3Service.findOneStations', () => {
    let service: ServiceV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('指定が無ければ全部入りの取得を呼ぶ', async () => {
        const expected = { stations: [] } as unknown as ServiceStationsDto;
        mockServiceQuery.findOneStationsForService.mockResolvedValue(expected);

        const result = await service.findOneStations({ serviceId: 'svc' });

        expect(mockServiceQuery.findOneStationsForService).toHaveBeenCalledWith(
            { serviceId: 'svc' },
        );
        expect(
            mockServiceQuery.findOneStationsForServiceWithSelection,
        ).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('include が空なら、駅だけを選んだ取得を呼ぶ', async () => {
        const expected = { stations: [] };
        mockServiceQuery.findOneStationsForServiceWithSelection.mockResolvedValue(
            expected,
        );

        const result = await service.findOneStations({
            serviceId: 'svc',
            include: '',
        });

        expect(
            mockServiceQuery.findOneStationsForServiceWithSelection,
        ).toHaveBeenCalledWith(
            { serviceId: 'svc' },
            { paths: new Set(['stations']), fields: new Map() },
        );
        expect(
            mockServiceQuery.findOneStationsForService,
        ).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('選んだ取得が null なら NotFoundException', async () => {
        mockServiceQuery.findOneStationsForServiceWithSelection.mockResolvedValue(
            null,
        );

        await expect(
            service.findOneStations({ serviceId: 'none', include: '' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('口に無い道筋の include は BadRequestException', async () => {
        await expect(
            service.findOneStations({
                serviceId: 'svc',
                include: 'stations.service',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockServiceQuery.findOneStationsForServiceWithSelection,
        ).not.toHaveBeenCalled();
    });
});

describe('ServiceV3Service - 一覧の fields', () => {
    const query = { findManyByServiceName: vi.fn() };
    const service = new ServiceV3Service(query as unknown as ServiceQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findManyByServiceName.mockResolvedValue([
            { id: 's1', serviceName: '相鉄線', serviceDescription: null },
        ]);
    });

    it('指定が無ければ今の取得をそのまま返す', async () => {
        await service.findMany({ serviceName: '相鉄線' });
        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
    });

    it('fields[service] の項目と id だけを返す', async () => {
        await expect(
            service.findMany({ fields: { service: 'serviceName' } }),
        ).resolves.toEqual([{ id: 's1', serviceName: '相鉄線' }]);
    });

    it('include は 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
    });
});
