import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { configureExpress } from '../../../core/configs/express-settings.js';
import request from 'supertest';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { FeatureFlags } from '../../../core/modules/feature-flag/feature-flags.js';
import { UserRoleService } from '../../user/usecase/user-role.service.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { OperationSightingV3Service } from '../usecase/operation-sighting.v3.service.js';
import { OperationSightingV3Controller } from './operation-sighting.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const SIGHTING_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';
const AUTHOR_SIGHTING_ID = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

describe('OperationSightingV3Controller（書き込みの役割と利用者）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        post: vi.fn(),
        invalidate: vi.fn(),
        restore: vi.fn(),
    };
    const featureFlags = { isEnabled: vi.fn() };
    const body = {
        agencyId: SIGHTING_ID,
        formationOrVehicleNumber: '8701',
        operationNumber: '41',
        sightingTime: '2026-10-23T01:00:00.000Z',
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [OperationSightingV3Controller],
            providers: [
                { provide: OperationSightingV3Service, useValue: service },
                { provide: FeatureFlags, useValue: featureFlags },
                // profiles に行が無い扱い（null）なら JWT の役割のまま
                {
                    provide: UserRoleService,
                    useValue: { findRole: vi.fn().mockResolvedValue(null) },
                },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (ctx: any) => {
                    ctx.switchToHttp().getRequest().auth = auth;
                    return true;
                },
            })
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
        featureFlags.isEnabled.mockResolvedValue(true);
        service.post.mockResolvedValue({ operationSightingId: SIGHTING_ID });
        service.invalidate.mockResolvedValue({});
        service.restore.mockResolvedValue({});
    });

    it('フラグ on で匿名（役割なし）の投稿は 403', async () => {
        auth = { userId: 'anon-1', role: null, sessionId: null };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(403);
        expect(featureFlags.isEnabled).toHaveBeenCalledWith(
            'registered_only_posting',
        );
        expect(service.post).not.toHaveBeenCalled();
    });

    it('フラグ off で匿名の投稿は 201 で、userId: null を渡す', async () => {
        featureFlags.isEnabled.mockResolvedValue(false);
        auth = { userId: 'anon-1', role: null, sessionId: null };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(201);
        expect(service.post).toHaveBeenCalledWith(
            expect.objectContaining({ userId: null }),
        );
    });

    it.each([true, false])(
        'フラグ %s で reporter の投稿は通り、JWT の sub を投稿者として渡す',
        async (enabled) => {
            featureFlags.isEnabled.mockResolvedValue(enabled);
            auth = { userId: 'user-1', role: Role.REPORTER, sessionId: null };
            const res = await request(app.getHttpServer()).post('/').send(body);
            expect(res.status).toBe(201);
            expect(service.post).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-1' }),
            );
        },
    );

    it('投稿には CloudFront-Viewer-Address の IP と User-Agent を viewer として渡す', async () => {
        auth = { userId: 'user-1', role: Role.REPORTER, sessionId: null };
        const res = await request(app.getHttpServer())
            .post('/')
            .set('CloudFront-Viewer-Address', '203.0.113.7:51234')
            .set('User-Agent', 'Mozilla/5.0 test')
            .send(body);
        expect(res.status).toBe(201);
        expect(service.post).toHaveBeenCalledWith(
            expect.objectContaining({
                viewer: { ip: '203.0.113.7', userAgent: 'Mozilla/5.0 test' },
            }),
        );
    });

    it('無効化・復元の口はフラグを見ない', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/invalidate`)
            .send({ reason: 'test' });
        await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/restore`)
            .send({ reason: 'test' });
        expect(featureFlags.isEnabled).not.toHaveBeenCalled();
    });

    it('無効化は body の userId を捨て、JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/invalidate`)
            .send({ userId: 'someone-else', reason: 'test' });
        expect(res.status).toBe(200);
        expect(service.invalidate).toHaveBeenCalledWith({
            operationSightingId: SIGHTING_ID,
            userId: 'editor-1',
            reason: 'test',
        });
    });

    it.each(['invalidate', 'restore'])(
        '%s は path の id が UUID でなければ 422',
        async (action) => {
            auth = { userId: 'editor-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer())
                .patch(`/not-a-uuid/${action}`)
                .send({ reason: 'test' });
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.invalidate).not.toHaveBeenCalled();
            expect(service.restore).not.toHaveBeenCalled();
        },
    );

    it('復元も JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.MANAGER, sessionId: null };
        const res = await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/restore`)
            .send({ reason: 'test' });
        expect(res.status).toBe(200);
        expect(service.restore).toHaveBeenCalledWith({
            operationSightingId: SIGHTING_ID,
            userId: 'editor-1',
            reason: 'test',
        });
    });
});

/** 投稿者つきの読み取りの口。個人情報を含むので EDITOR・MANAGER だけ・応答は保存させない */
const READ_ROUTES = [`/${AUTHOR_SIGHTING_ID}/author`, '/recent'];

describe('OperationSightingV3Controller（投稿者つきの読み取りの口・まとめての無効化）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        findAuthor: vi.fn(),
        findManyRecent: vi.fn(),
        invalidateMany: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [OperationSightingV3Controller],
            providers: [
                { provide: OperationSightingV3Service, useValue: service },
                { provide: FeatureFlags, useValue: { isEnabled: vi.fn() } },
                {
                    provide: UserRoleService,
                    useValue: { findRole: vi.fn().mockResolvedValue(null) },
                },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (ctx: any) => {
                    ctx.switchToHttp().getRequest().auth = auth;
                    return true;
                },
            })
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
        service.findAuthor.mockResolvedValue({ userId: null });
        service.findManyRecent.mockResolvedValue([]);
    });

    it.each(READ_ROUTES)('%s は REPORTER で 403', async (path) => {
        auth = { userId: 'u-1', role: Role.REPORTER, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(403);
        expect(service.findAuthor).not.toHaveBeenCalled();
        expect(service.findManyRecent).not.toHaveBeenCalled();
    });

    it.each(READ_ROUTES)('%s は VIEWER・匿名でも 403', async (path) => {
        auth = { userId: 'u-1', role: Role.VIEWER, sessionId: null };
        expect((await request(app.getHttpServer()).get(path)).status).toBe(403);
        auth = { userId: 'anon', role: null, sessionId: null };
        expect((await request(app.getHttpServer()).get(path)).status).toBe(403);
    });

    it.each(READ_ROUTES)('%s は EDITOR で 200', async (path) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(200);
    });

    it.each(READ_ROUTES)('%s は MANAGER で 200', async (path) => {
        auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(200);
    });

    it.each(READ_ROUTES)(
        '%s の応答は保存させない（個人情報を含む）',
        async (path) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(path);
            expect(res.headers['cache-control']).toBe('no-store');
        },
    );

    it('投稿者の口は目撃 id を渡す', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get(`/${AUTHOR_SIGHTING_ID}/author`);
        expect(service.findAuthor).toHaveBeenCalledWith({
            operationSightingId: AUTHOR_SIGHTING_ID,
        });
    });

    it('新着の limit の既定は 100、before は無し', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get('/recent');
        expect(service.findManyRecent).toHaveBeenCalledWith({
            limit: 100,
            before: undefined,
        });
    });

    it('新着の limit と before を受け取る', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get(
            '/recent?limit=5&before=2026-11-01T00:00:00.000Z',
        );
        expect(service.findManyRecent).toHaveBeenCalledWith({
            limit: 5,
            before: '2026-11-01T00:00:00.000Z',
        });
    });

    it.each(['0', '201', '1.5', 'abc'])(
        '新着の limit=%s は 422',
        async (limit) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(
                `/recent?limit=${limit}`,
            );
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.findManyRecent).not.toHaveBeenCalled();
        },
    );

    it.each(['1', '200'])('新着の limit=%s は通る', async (limit) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            `/recent?limit=${limit}`,
        );
        expect(res.status).toBe(200);
    });

    it('新着の before が ISO 8601 でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            '/recent?before=yesterday',
        );
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
    });

    it.each(['2026-W01', '2026-123', '2026-02-30', '2026-02-30T00:00:00.000Z'])(
        '新着の before=%s は Date にできない・暦上ありえないので 422',
        async (before) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(
                `/recent?before=${before}`,
            );
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.findManyRecent).not.toHaveBeenCalled();
        },
    );

    it('path の id が UUID でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            '/not-a-uuid/author',
        );
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
    });

    describe('POST /invalidate', () => {
        const PATH = '/invalidate';
        const ID_A = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
        const ID_B = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5e';
        const RESULT = {
            invalidated: [ID_A],
            skipped: [{ id: ID_B, reason: 'not_found' }],
            failed: null,
            pending: [],
        };

        beforeEach(() => {
            service.invalidateMany.mockResolvedValue(RESULT);
        });

        it('REPORTER・VIEWER・匿名は 403', async () => {
            for (const role of [Role.REPORTER, Role.VIEWER, null]) {
                auth = { userId: 'u-1', role, sessionId: null };
                const res = await request(app.getHttpServer())
                    .post(PATH)
                    .send({ ids: [ID_A], reason: 'r' });
                expect(res.status).toBe(403);
            }
            expect(service.invalidateMany).not.toHaveBeenCalled();
        });

        it.each([Role.EDITOR, Role.MANAGER])(
            '%s は 200 で結果を返し、認証した userId で呼ぶ',
            async (role) => {
                auth = { userId: 'e-1', role, sessionId: null };
                const res = await request(app.getHttpServer())
                    .post(PATH)
                    .send({ ids: [ID_A, ID_B], reason: '荒らし' });
                expect(res.status).toBe(200);
                expect(res.body).toEqual(RESULT);
                expect(res.headers['cache-control']).toBe('no-store');
                expect(service.invalidateMany).toHaveBeenCalledWith({
                    ids: [ID_A, ID_B],
                    userId: 'e-1',
                    reason: '荒らし',
                });
            },
        );

        it('200 件は通り、201 件は 422', async () => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const make = (n: number) =>
                Array.from(
                    { length: n },
                    (_, i) =>
                        `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
                );
            const ok = await request(app.getHttpServer())
                .post(PATH)
                .send({ ids: make(200), reason: 'r' });
            expect(ok.status).toBe(200);
            service.invalidateMany.mockClear();
            const ng = await request(app.getHttpServer())
                .post(PATH)
                .send({ ids: make(201), reason: 'r' });
            expect(ng.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.invalidateMany).not.toHaveBeenCalled();
        });

        it.each([
            ['ids が空', { ids: [], reason: 'r' }],
            ['ids が無い', { reason: 'r' }],
            ['ids が配列でない', { ids: ID_A, reason: 'r' }],
            ['ids に UUID でないものがある', { ids: [ID_A, 'x'], reason: 'r' }],
            ['reason が無い', { ids: [ID_A] }],
            ['reason が空', { ids: [ID_A], reason: '' }],
            ['reason が 201 字', { ids: [ID_A], reason: 'あ'.repeat(201) }],
        ])('%s は 422', async (_label, body) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(PATH)
                .send(body);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.invalidateMany).not.toHaveBeenCalled();
        });

        it('reason が 200 字なら通る', async () => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(PATH)
                .send({ ids: [ID_A], reason: 'あ'.repeat(200) });
            expect(res.status).toBe(200);
        });
    });
});

describe('OperationSightingV3Controller（日付・期間・時刻・番号の並びの検証）', () => {
    let app: NestExpressApplication;
    const service = {
        findManyBySpecificPeriod: vi.fn(),
        findManyTimeCrossSectionsByOperationNumbers: vi.fn(),
        findManyTimeCrossSectionsByFormationNumbers: vi.fn(),
        findOneTimeCrossSectionByOperationNumber: vi.fn(),
        findOneTimeCrossSectionByFormationNumber: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [OperationSightingV3Controller],
            providers: [
                { provide: OperationSightingV3Service, useValue: service },
                { provide: FeatureFlags, useValue: { isEnabled: vi.fn() } },
                {
                    provide: UserRoleService,
                    useValue: { findRole: vi.fn().mockResolvedValue(null) },
                },
            ],
        })
            .overrideGuard(AuthGuard)
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
        service.findManyTimeCrossSectionsByOperationNumbers.mockResolvedValue(
            {},
        );
        service.findManyTimeCrossSectionsByFormationNumbers.mockResolvedValue(
            {},
        );
        service.findOneTimeCrossSectionByOperationNumber.mockResolvedValue({});
        service.findOneTimeCrossSectionByFormationNumber.mockResolvedValue({});
    });

    const UNPROCESSABLE = validationPipeOptions.errorHttpStatusCode;
    const makeNumbers = (n: number) =>
        Array.from({ length: n }, (_, i) => `n${i}`).join(',');

    describe('期間 /from/:start/to/:end', () => {
        it('31 日（両端を含む）は通り、start・end・既存の query を service に渡す', async () => {
            const res = await request(app.getHttpServer()).get(
                '/from/2026-11-01/to/2026-12-01?includeInvalidated=true&includeCarriedOver=true',
            );
            expect(res.status).toBe(200);
            expect(service.findManyBySpecificPeriod).toHaveBeenCalledWith({
                start: '2026-11-01',
                end: '2026-12-01',
                includeInvalidated: true,
                includeCarriedOver: true,
            });
        });

        it.each([
            ['/from/2026-11-01/to/2026-12-02'],
            ['/from/garbage/to/2026-11-14'],
            ['/from/2026-02-30/to/2026-03-01'],
            ['/from/2026-11-14/to/2026-11-13'],
        ])('%s は 422 で service を呼ばない', async (path) => {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(UNPROCESSABLE);
            expect(service.findManyBySpecificPeriod).not.toHaveBeenCalled();
        });
    });

    describe('時刻断面のまとめ取り', () => {
        it('operationNumbers=11,31G は ["11","31G"] を渡す', async () => {
            const res = await request(app.getHttpServer()).get(
                '/time-cross-section/operation-numbers?operationNumbers=11,31G',
            );
            expect(res.status).toBe(200);
            expect(
                service.findManyTimeCrossSectionsByOperationNumbers,
            ).toHaveBeenCalledWith({
                operationNumbers: ['11', '31G'],
                searchTime: undefined,
            });
        });

        it('formationNumbers=10701,10702 は配列を渡す', async () => {
            const res = await request(app.getHttpServer()).get(
                '/time-cross-section/formation-numbers?formationNumbers=10701,10702',
            );
            expect(res.status).toBe(200);
            expect(
                service.findManyTimeCrossSectionsByFormationNumbers,
            ).toHaveBeenCalledWith({
                formationNumbers: ['10701', '10702'],
                searchTime: undefined,
            });
        });

        it('200 件は通り、201 件は 422', async () => {
            const ok = await request(app.getHttpServer()).get(
                `/time-cross-section/operation-numbers?operationNumbers=${makeNumbers(200)}`,
            );
            expect(ok.status).toBe(200);
            service.findManyTimeCrossSectionsByOperationNumbers.mockClear();
            const ng = await request(app.getHttpServer()).get(
                `/time-cross-section/operation-numbers?operationNumbers=${makeNumbers(201)}`,
            );
            expect(ng.status).toBe(UNPROCESSABLE);
            expect(
                service.findManyTimeCrossSectionsByOperationNumbers,
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['/time-cross-section/operation-numbers?operationNumbers='],
            ['/time-cross-section/operation-numbers'],
            ['/time-cross-section/formation-numbers?formationNumbers='],
            ['/time-cross-section/formation-numbers'],
        ])('%s は 422', async (path) => {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(UNPROCESSABLE);
            expect(
                service.findManyTimeCrossSectionsByOperationNumbers,
            ).not.toHaveBeenCalled();
            expect(
                service.findManyTimeCrossSectionsByFormationNumbers,
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['/time-cross-section/operation-numbers?operationNumbers[a]=1'],
            ['/time-cross-section/operation-numbers?operationNumbers[0][a]=1'],
            ['/time-cross-section/formation-numbers?formationNumbers[a]=1'],
            ['/time-cross-section/formation-numbers?formationNumbers[0][a]=1'],
        ])('%s のようなオブジェクト・入れ子は 422', async (path) => {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(UNPROCESSABLE);
            expect(
                service.findManyTimeCrossSectionsByOperationNumbers,
            ).not.toHaveBeenCalled();
            expect(
                service.findManyTimeCrossSectionsByFormationNumbers,
            ).not.toHaveBeenCalled();
        });
    });

    describe('searchTime', () => {
        it.each([
            [
                '/time-cross-section/operation-numbers?operationNumbers=11',
                'findManyTimeCrossSectionsByOperationNumbers',
            ],
            [
                '/time-cross-section/formation-numbers?formationNumbers=10701',
                'findManyTimeCrossSectionsByFormationNumbers',
            ],
            [
                '/time-cross-section/operation-number/11?x=1',
                'findOneTimeCrossSectionByOperationNumber',
            ],
            [
                '/time-cross-section/formation-number/10701?x=1',
                'findOneTimeCrossSectionByFormationNumber',
            ],
        ] as const)(
            '%s は時差付きなら通し、時差なしは 422',
            async (path, method) => {
                const sep = path.includes('?') ? '&' : '?';
                const ok = await request(app.getHttpServer()).get(
                    `${path}${sep}searchTime=2026-11-14T12:00:00%2B09:00`,
                );
                expect(ok.status).toBe(200);
                expect(service[method]).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchTime: '2026-11-14T12:00:00+09:00',
                    }),
                );
                service[method].mockClear();
                const ng = await request(app.getHttpServer()).get(
                    `${path}${sep}searchTime=2026-11-14T12:00:00`,
                );
                expect(ng.status).toBe(UNPROCESSABLE);
                expect(service[method]).not.toHaveBeenCalled();
            },
        );

        it('単体の口は運用番号・編成番号と include・fields も渡す', async () => {
            await request(app.getHttpServer()).get(
                '/time-cross-section/operation-number/11?fields[operationSightingTimeCrossSection]=a',
            );
            expect(
                service.findOneTimeCrossSectionByOperationNumber,
            ).toHaveBeenCalledWith({
                operationNumber: '11',
                searchTime: undefined,
                fields: { operationSightingTimeCrossSection: 'a' },
            });
        });
    });
});
