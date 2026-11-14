import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { configureExpress } from '../../../core/configs/express-settings.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { OperationV3Service } from '../usecase/operation.v3.service.js';
import { OperationV3Controller } from './operation.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const CALENDAR_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('OperationV3Controller (itinerary-links / next-operation-candidates)', () => {
    let app: NestExpressApplication;
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
        app = moduleRef.createNestApplication<NestExpressApplication>();
        configureExpress(app);
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

    it('stationId が無くても stationId なしでサービスに渡す（空にするのはサービス）', async () => {
        const res = await request(app.getHttpServer()).get(
            `/next-operation-candidates?calendarId=${CALENDAR_ID}`,
        );

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(service.findManyNextSegmentCandidates).toHaveBeenCalledWith({
            calendarId: CALENDAR_ID,
            stationId: undefined,
            afterSeconds: 0,
        });
    });

    it('/next-operation-candidates は fields をサービスに渡す', async () => {
        await request(app.getHttpServer()).get(
            `/next-operation-candidates?calendarId=${CALENDAR_ID}&stationId=st1&fields[nextSegmentCandidate]=isTaken`,
        );

        expect(service.findManyNextSegmentCandidates).toHaveBeenCalledWith({
            calendarId: CALENDAR_ID,
            stationId: 'st1',
            afterSeconds: 0,
            fields: { nextSegmentCandidate: 'isTaken' },
        });
    });

    it.each([
        ['/not-a-uuid/trips'],
        ['/not-a-uuid/current-position'],
        ['/calendar/not-a-uuid'],
        ['/calendar/not-a-uuid/trips'],
    ])('%s は path の id が UUID でなければ 422', async (path) => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        expect(service.findOneWithTrips).not.toHaveBeenCalled();
    });

    it('/:id/trips は UUID の id をそのまま渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            `/${CALENDAR_ID}/trips`,
        );

        expect(res.status).toBe(200);
        expect(service.findOneWithTrips).toHaveBeenCalledWith({
            operationId: CALENDAR_ID,
            include: undefined,
            fields: undefined,
        });
    });

    it('旧 URL は残らない', async () => {
        const res = await request(app.getHttpServer()).get(
            `/calendar/${CALENDAR_ID}/itinerary-links`,
        );

        expect(res.status).toBe(404);
    });
});

describe('OperationV3Controller（日付・期間・時刻・UUID の並びの検証）', () => {
    let app: NestExpressApplication;
    const service = {
        findManyBySpecificPeriod: vi.fn(),
        findManyWithCurrentPosition: vi.fn(),
        findOneWithCurrentPosition: vi.fn(),
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
        app = moduleRef.createNestApplication<NestExpressApplication>();
        configureExpress(app);
        app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        service.findManyBySpecificPeriod.mockResolvedValue([]);
        service.findManyWithCurrentPosition.mockResolvedValue([]);
        service.findOneWithCurrentPosition.mockResolvedValue({});
    });

    const UNPROCESSABLE = validationPipeOptions.errorHttpStatusCode;
    const OTHER_ID = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

    it('/from/:start/to/:end は 31 日まで通し、start・end を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            '/from/2026-11-01/to/2026-12-01',
        );
        expect(res.status).toBe(200);
        expect(service.findManyBySpecificPeriod).toHaveBeenCalledWith({
            start: '2026-11-01',
            end: '2026-12-01',
        });
    });

    it.each([
        ['/from/2026-11-01/to/2026-12-02'],
        ['/from/garbage/to/2026-11-14'],
        ['/from/2026-02-30/to/2026-03-01'],
    ])('%s は 422', async (path) => {
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(UNPROCESSABLE);
        expect(service.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });

    it('/current-positions は UUID の並びを配列にして渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            `/current-positions?operationIds=${CALENDAR_ID},${OTHER_ID}&searchTime=2026-11-14T12:00:00%2B09:00`,
        );
        expect(res.status).toBe(200);
        expect(service.findManyWithCurrentPosition).toHaveBeenCalledWith({
            operationIds: [CALENDAR_ID, OTHER_ID],
            searchTime: '2026-11-14T12:00:00+09:00',
        });
    });

    it.each([
        [`/current-positions?operationIds=${CALENDAR_ID},not-a-uuid`],
        ['/current-positions?operationIds='],
        ['/current-positions'],
        ['/current-positions?operationIds[a]=1'],
        [
            `/current-positions?operationIds=${CALENDAR_ID}&searchTime=2026-11-14T12:00:00`,
        ],
    ])('%s は 422', async (path) => {
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(UNPROCESSABLE);
        expect(service.findManyWithCurrentPosition).not.toHaveBeenCalled();
    });

    it('/current-positions は 200 件まで通し、201 件は 422', async () => {
        const make = (n: number) =>
            Array.from(
                { length: n },
                (_, i) =>
                    `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            ).join(',');
        const ok = await request(app.getHttpServer()).get(
            `/current-positions?operationIds=${make(200)}`,
        );
        expect(ok.status).toBe(200);
        service.findManyWithCurrentPosition.mockClear();
        const ng = await request(app.getHttpServer()).get(
            `/current-positions?operationIds=${make(201)}`,
        );
        expect(ng.status).toBe(UNPROCESSABLE);
        expect(service.findManyWithCurrentPosition).not.toHaveBeenCalled();
    });

    it('/:id/current-position は searchTime を渡し、時差なしは 422', async () => {
        const ok = await request(app.getHttpServer()).get(
            `/${CALENDAR_ID}/current-position?searchTime=2026-11-14T12:00:00%2B09:00`,
        );
        expect(ok.status).toBe(200);
        expect(service.findOneWithCurrentPosition).toHaveBeenCalledWith({
            operationId: CALENDAR_ID,
            searchTime: '2026-11-14T12:00:00+09:00',
        });
        service.findOneWithCurrentPosition.mockClear();
        const ng = await request(app.getHttpServer()).get(
            `/${CALENDAR_ID}/current-position?searchTime=2026-11-14T12:00:00`,
        );
        expect(ng.status).toBe(UNPROCESSABLE);
        expect(service.findOneWithCurrentPosition).not.toHaveBeenCalled();
    });
});
