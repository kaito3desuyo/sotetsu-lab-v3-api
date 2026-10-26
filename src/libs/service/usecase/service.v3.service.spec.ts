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

describe('ServiceV3Service - 事業者・路線の include・fields', () => {
    const query = {
        findOneWithAgencies: vi.fn(),
        findOneWithRoutes: vi.fn(),
    };
    const service = new ServiceV3Service(query as unknown as ServiceQuery);
    const serviceRow = {
        id: 's1',
        serviceName: '相鉄線',
        serviceDescription: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        query.findOneWithAgencies.mockResolvedValue({
            service: serviceRow,
            agencies: [{ id: 'a1', agencyName: '相鉄', agencyUrl: null }],
        });
        query.findOneWithRoutes.mockResolvedValue({
            service: serviceRow,
            routes: [
                {
                    id: 'r1',
                    routeName: '本線',
                    sequence: 1,
                    startRouteStationListId: 'rsl1',
                },
            ],
        });
    });

    it('事業者: 指定が無ければ今の応答をそのまま返す', async () => {
        const result = await service.findOneWithAgencies({ serviceId: 's1' });
        expect(result).toEqual({
            service: serviceRow,
            agencies: [{ id: 'a1', agencyName: '相鉄', agencyUrl: null }],
        });
        expect(query.findOneWithAgencies).toHaveBeenCalledWith({
            serviceId: 's1',
        });
    });

    it('事業者: 見つからなければ 404', async () => {
        query.findOneWithAgencies.mockResolvedValue(null);
        await expect(
            service.findOneWithAgencies({ serviceId: 'x' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('事業者: include= なら運行系統を出さない', async () => {
        await expect(
            service.findOneWithAgencies({
                serviceId: 's1',
                include: '',
                fields: { agency: 'agencyName' },
            }),
        ).resolves.toEqual({ agencies: [{ id: 'a1', agencyName: '相鉄' }] });
    });

    it('事業者: fields[service] だけなら、外せない事業者は id だけ', async () => {
        await expect(
            service.findOneWithAgencies({
                serviceId: 's1',
                fields: { service: 'serviceName' },
            }),
        ).resolves.toEqual({
            service: { id: 's1', serviceName: '相鉄線' },
            agencies: [{ id: 'a1' }],
        });
    });

    it('路線: fields[route] で運行系統の並びも選べる', async () => {
        await expect(
            service.findOneWithRoutes({
                serviceId: 's1',
                include: '',
                fields: { route: 'routeName,sequence' },
            }),
        ).resolves.toEqual({
            routes: [{ id: 'r1', routeName: '本線', sequence: 1 }],
        });
    });

    it('路線: 崩れた include は 400 で、query を呼ばない', async () => {
        await expect(
            service.findOneWithRoutes({ serviceId: 's1', include: 'agencies' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: agencies'),
        );
        expect(query.findOneWithRoutes).not.toHaveBeenCalled();
    });

    it('路線: 見つからなければ指定があっても 404', async () => {
        query.findOneWithRoutes.mockResolvedValue(null);
        await expect(
            service.findOneWithRoutes({ serviceId: 'x', include: '' }),
        ).rejects.toThrow(NotFoundException);
    });
});
