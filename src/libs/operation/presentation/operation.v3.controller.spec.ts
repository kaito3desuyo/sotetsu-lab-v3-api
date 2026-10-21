import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { OperationV3Service } from '../usecase/operation.v3.service.js';
import { OperationV3Controller } from './operation.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const CALENDAR_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('OperationV3Controller (itinerary-links / next-operation-candidates)', () => {
    let app: INestApplication;
    const service = {
        findManyItineraryLinks: vi.fn(),
        findManyNextSegmentCandidates: vi.fn(),
        findOneWithTrips: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [OperationV3Controller],
            providers: [{ provide: OperationV3Service, useValue: service }],
        })
            .overrideGuard(AuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RBACGuard)
            .useValue({ canActivate: () => true })
            .compile();
        app = moduleRef.createNestApplication();
        app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        service.findManyItineraryLinks.mockResolvedValue([]);
        service.findManyNextSegmentCandidates.mockResolvedValue([]);
        service.findOneWithTrips.mockResolvedValue({});
    });

    it('GET /itinerary-links?calendarId= は calendarId を渡し、private の Cache-Control を返す', async () => {
        const res = await request(app.getHttpServer()).get(
            `/itinerary-links?calendarId=${CALENDAR_ID}`,
        );

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
        expect(service.findManyItineraryLinks).toHaveBeenCalledWith({
            calendarId: CALENDAR_ID,
        });
        expect(service.findOneWithTrips).not.toHaveBeenCalled();
    });

    it.each([
        ['/itinerary-links'],
        ['/itinerary-links?calendarId=abc'],
        ['/next-operation-candidates'],
        ['/next-operation-candidates?calendarId=abc&stationId=s'],
    ])('%s は calendarId の欠落・非 UUID で検証エラーになる', async (path) => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        expect(service.findManyItineraryLinks).not.toHaveBeenCalled();
        expect(service.findManyNextSegmentCandidates).not.toHaveBeenCalled();
    });

    it('GET /next-operation-candidates は stationId・afterSeconds を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            `/next-operation-candidates?calendarId=${CALENDAR_ID}&stationId=st1&afterSeconds=3600`,
        );

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
        expect(service.findManyNextSegmentCandidates).toHaveBeenCalledWith({
            calendarId: CALENDAR_ID,
            stationId: 'st1',
            afterSeconds: 3600,
        });
    });

    it('stationId が無ければ空配列を返し、サービスを呼ばない', async () => {
        const res = await request(app.getHttpServer()).get(
            `/next-operation-candidates?calendarId=${CALENDAR_ID}`,
        );

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(service.findManyNextSegmentCandidates).not.toHaveBeenCalled();
    });

    it('旧 URL は残らない', async () => {
        const res = await request(app.getHttpServer()).get(
            `/calendar/${CALENDAR_ID}/itinerary-links`,
        );

        expect(res.status).toBe(404);
    });
});
