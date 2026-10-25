import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RouteQuery } from '../infrastructure/queries/route.query.js';
import { RouteV3Service } from './route.v3.service.js';

const routeStations = {
    route: { id: 'r1', routeName: '本線', routeColor: null },
    stations: [
        {
            id: 'st1',
            stationName: '横浜',
            stationSequence: 1,
            stationNumbering: 'SO01',
        },
    ],
};

describe('RouteV3Service - 駅一覧の include・fields', () => {
    const query = {
        findOneWithStations: vi.fn(),
        findManyByServiceName: vi.fn(),
        findManyByServiceNameWithSelection: vi.fn(),
    };
    const service = new RouteV3Service(query as unknown as RouteQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findOneWithStations.mockResolvedValue(routeStations);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(
            service.findOneWithStations({ routeId: 'r1' }),
        ).resolves.toEqual(routeStations);
        expect(query.findOneWithStations).toHaveBeenCalledWith({
            routeId: 'r1',
        });
    });

    it('include= なら路線を出さず、駅は fields[station] で削る', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: '',
                fields: { station: 'stationName,stationNumbering' },
            }),
        ).resolves.toEqual({
            stations: [
                { id: 'st1', stationName: '横浜', stationNumbering: 'SO01' },
            ],
        });
    });

    it('include=route なら路線も返し、null は省く', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: 'route',
                fields: {
                    route: 'routeName,routeColor',
                    station: 'stationName',
                },
            }),
        ).resolves.toEqual({
            route: { id: 'r1', routeName: '本線' },
            stations: [{ id: 'st1', stationName: '横浜' }],
        });
    });

    it('木に無い道筋は 400 で、query を呼ばない', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: 'stations.route',
            }),
        ).rejects.toThrow(
            new BadRequestException(
                'include に指定できない道筋: stations.route',
            ),
        );
        expect(query.findOneWithStations).not.toHaveBeenCalled();
    });

    it('見つからなければ指定があっても 404', async () => {
        query.findOneWithStations.mockResolvedValue(null);
        await expect(
            service.findOneWithStations({ routeId: 'x', include: '' }),
        ).rejects.toThrow(NotFoundException);
    });
});

describe('RouteV3Service - 一覧の include・fields', () => {
    const query = {
        findOneWithStations: vi.fn(),
        findManyByServiceName: vi.fn().mockResolvedValue([]),
        findManyByServiceNameWithSelection: vi.fn().mockResolvedValue([]),
    };
    const service = new RouteV3Service(query as unknown as RouteQuery);

    beforeEach(() => vi.clearAllMocks());

    it('指定が無ければ今の取得', async () => {
        await service.findMany({ serviceName: '相鉄線' });
        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
        expect(query.findManyByServiceNameWithSelection).not.toHaveBeenCalled();
    });

    it('指定があれば選択の取得', async () => {
        await service.findMany({ serviceName: '相鉄線', include: '' });
        expect(query.findManyByServiceNameWithSelection).toHaveBeenCalledWith(
            { serviceName: '相鉄線' },
            { paths: new Set(), fields: new Map() },
        );
    });

    it('崩れた指定は 400 で、query を呼ばない', async () => {
        await expect(
            service.findMany({ include: 'operatingSystems' }),
        ).rejects.toThrow(
            new BadRequestException(
                'include に指定できない道筋: operatingSystems',
            ),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
        expect(query.findManyByServiceNameWithSelection).not.toHaveBeenCalled();
    });
});
