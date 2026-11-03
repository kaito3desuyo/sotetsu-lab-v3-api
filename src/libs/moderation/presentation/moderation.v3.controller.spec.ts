import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { FeatureFlags } from '../../../core/modules/feature-flag/feature-flags.js';
import { CurrentRoles } from '../../../core/modules/rbac/current-roles.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { ModerationV3Service } from '../usecase/moderation.v3.service.js';
import { ModerationV3Controller } from './moderation.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const USER_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';
const SIGHTING_ID = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

const ROUTES = [
    `/users/${USER_ID}`,
    `/users/${USER_ID}/sightings`,
    `/sightings/${SIGHTING_ID}/author`,
    '/recent-sightings',
];

describe('ModerationV3Controller（投稿管理の読み取りの口）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        findUserSummary: vi.fn(),
        findSightingsByUser: vi.fn(),
        findSightingAuthor: vi.fn(),
        findRecentSightings: vi.fn(),
        invalidateSightings: vi.fn(),
        banUser: vi.fn(),
        unbanUser: vi.fn(),
        findTraces: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [ModerationV3Controller],
            providers: [
                { provide: ModerationV3Service, useValue: service },
                { provide: FeatureFlags, useValue: { isEnabled: vi.fn() } },
                {
                    provide: CurrentRoles,
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
        service.findUserSummary.mockResolvedValue({ userId: USER_ID });
        service.findSightingsByUser.mockResolvedValue([]);
        service.findSightingAuthor.mockResolvedValue({ userId: null });
        service.findRecentSightings.mockResolvedValue([]);
    });

    it.each(ROUTES)('%s は REPORTER で 403', async (path) => {
        auth = { userId: 'u-1', role: Role.REPORTER, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(403);
        expect(service.findUserSummary).not.toHaveBeenCalled();
        expect(service.findSightingsByUser).not.toHaveBeenCalled();
        expect(service.findSightingAuthor).not.toHaveBeenCalled();
        expect(service.findRecentSightings).not.toHaveBeenCalled();
    });

    it.each(ROUTES)('%s は VIEWER・匿名でも 403', async (path) => {
        auth = { userId: 'u-1', role: Role.VIEWER, sessionId: null };
        expect((await request(app.getHttpServer()).get(path)).status).toBe(403);
        auth = { userId: 'anon', role: null, sessionId: null };
        expect((await request(app.getHttpServer()).get(path)).status).toBe(403);
    });

    it.each(ROUTES)('%s は EDITOR で 200', async (path) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(200);
    });

    it.each(ROUTES)('%s は MANAGER で 200', async (path) => {
        auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(200);
    });

    it('応答は保存させない（個人情報を含む）', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get('/recent-sightings');
        expect(res.headers['cache-control']).toBe('no-store');
    });

    it('limit の既定は 100、before は無し', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get('/recent-sightings');
        expect(service.findRecentSightings).toHaveBeenCalledWith({
            limit: 100,
            before: undefined,
        });
        await request(app.getHttpServer()).get(`/users/${USER_ID}/sightings`);
        expect(service.findSightingsByUser).toHaveBeenCalledWith({
            userId: USER_ID,
            limit: 100,
            before: undefined,
        });
    });

    it('limit と before を受け取る', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get(
            '/recent-sightings?limit=5&before=2026-11-01T00:00:00.000Z',
        );
        expect(service.findRecentSightings).toHaveBeenCalledWith({
            limit: 5,
            before: '2026-11-01T00:00:00.000Z',
        });
    });

    it.each(['0', '201', '1.5', 'abc'])('limit=%s は 422', async (limit) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        for (const path of [
            '/recent-sightings',
            `/users/${USER_ID}/sightings`,
        ]) {
            const res = await request(app.getHttpServer()).get(
                `${path}?limit=${limit}`,
            );
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        }
        expect(service.findRecentSightings).not.toHaveBeenCalled();
        expect(service.findSightingsByUser).not.toHaveBeenCalled();
    });

    it.each(['1', '200'])('limit=%s は通る', async (limit) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            `/recent-sightings?limit=${limit}`,
        );
        expect(res.status).toBe(200);
    });

    it('before が ISO 8601 でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            '/recent-sightings?before=yesterday',
        );
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
    });

    it.each(['2026-W01', '2026-123', '2026-02-30', '2026-02-30T00:00:00.000Z'])(
        'before=%s は Date にできない・暦上ありえないので 422',
        async (before) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            for (const path of [
                '/recent-sightings',
                `/users/${USER_ID}/sightings`,
            ]) {
                const res = await request(app.getHttpServer()).get(
                    `${path}?before=${before}`,
                );
                expect(res.status).toBe(
                    validationPipeOptions.errorHttpStatusCode,
                );
            }
            expect(service.findRecentSightings).not.toHaveBeenCalled();
            expect(service.findSightingsByUser).not.toHaveBeenCalled();
        },
    );

    it('path の userId・id が UUID でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        for (const path of [
            '/users/not-a-uuid',
            '/users/not-a-uuid/sightings',
            '/sightings/not-a-uuid/author',
        ]) {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        }
    });

    describe('POST /sightings/invalidate', () => {
        const PATH = '/sightings/invalidate';
        const ID_A = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
        const ID_B = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5e';
        const RESULT = {
            invalidated: [ID_A],
            skipped: [{ id: ID_B, reason: 'not_found' }],
            failed: null,
            pending: [],
        };

        beforeEach(() => {
            service.invalidateSightings.mockResolvedValue(RESULT);
        });

        it('REPORTER・VIEWER・匿名は 403', async () => {
            for (const role of [Role.REPORTER, Role.VIEWER, null]) {
                auth = { userId: 'u-1', role, sessionId: null };
                const res = await request(app.getHttpServer())
                    .post(PATH)
                    .send({ ids: [ID_A], reason: 'r' });
                expect(res.status).toBe(403);
            }
            expect(service.invalidateSightings).not.toHaveBeenCalled();
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
                expect(service.invalidateSightings).toHaveBeenCalledWith({
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
            service.invalidateSightings.mockClear();
            const ng = await request(app.getHttpServer())
                .post(PATH)
                .send({ ids: make(201), reason: 'r' });
            expect(ng.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.invalidateSightings).not.toHaveBeenCalled();
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
            expect(service.invalidateSightings).not.toHaveBeenCalled();
        });

        it('reason が 200 字なら通る', async () => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(PATH)
                .send({ ids: [ID_A], reason: 'あ'.repeat(200) });
            expect(res.status).toBe(200);
        });
    });
    describe('BAN・解除・手がかり（MANAGER だけ）', () => {
        const SUMMARY = { userId: USER_ID, banned: true };
        const CALLS = [
            {
                label: 'POST /users/:userId/ban',
                method: 'post' as const,
                path: `/users/${USER_ID}/ban`,
                body: { reason: '荒らし' },
            },
            {
                label: 'POST /users/:userId/unban',
                method: 'post' as const,
                path: `/users/${USER_ID}/unban`,
                body: { reason: '誤爆' },
            },
            {
                label: 'GET /users/:userId/traces',
                method: 'get' as const,
                path: `/users/${USER_ID}/traces`,
                body: undefined,
            },
        ];
        const call = (c: (typeof CALLS)[number]) => {
            const req = request(app.getHttpServer())[c.method](c.path);
            return c.body ? req.send(c.body) : req;
        };
        const writes = () => [
            service.banUser,
            service.unbanUser,
            service.findTraces,
        ];

        beforeEach(() => {
            service.banUser.mockResolvedValue(SUMMARY);
            service.unbanUser.mockResolvedValue(SUMMARY);
            service.findTraces.mockResolvedValue([]);
        });

        it.each(CALLS)('$label は EDITOR で 403', async (c) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            expect((await call(c)).status).toBe(403);
            writes().forEach((fn) => expect(fn).not.toHaveBeenCalled());
        });

        it.each(CALLS)(
            '$label は REPORTER・VIEWER・匿名でも 403',
            async (c) => {
                for (const role of [Role.REPORTER, Role.VIEWER, null]) {
                    auth = { userId: 'u-1', role, sessionId: null };
                    expect((await call(c)).status).toBe(403);
                }
                writes().forEach((fn) => expect(fn).not.toHaveBeenCalled());
            },
        );

        it.each(CALLS)('$label は MANAGER で 200・保存させない', async (c) => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await call(c);
            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toBe('no-store');
        });

        it('ban は認証した userId を changedBy にして理由を渡す', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/users/${USER_ID}/ban`)
                .send({ reason: '荒らし' });
            expect(res.body).toEqual(SUMMARY);
            expect(service.banUser).toHaveBeenCalledWith({
                userId: USER_ID,
                changedBy: 'm-1',
                reason: '荒らし',
            });
        });

        it('unban の理由は省略できる', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            await request(app.getHttpServer())
                .post(`/users/${USER_ID}/unban`)
                .send({});
            expect(service.unbanUser).toHaveBeenCalledWith({
                userId: USER_ID,
                changedBy: 'm-1',
                reason: undefined,
            });
        });

        it('traces は userId を渡す', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            await request(app.getHttpServer()).get(`/users/${USER_ID}/traces`);
            expect(service.findTraces).toHaveBeenCalledWith({
                userId: USER_ID,
            });
        });

        it.each([
            ['reason が無い', {}],
            ['reason が空', { reason: '' }],
            ['reason が 201 字', { reason: 'あ'.repeat(201) }],
            ['reason が文字列でない', { reason: 1 }],
        ])('ban は %s なら 422', async (_label, body) => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/users/${USER_ID}/ban`)
                .send(body);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.banUser).not.toHaveBeenCalled();
        });

        it('ban の reason は 200 字ちょうどなら通る', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/users/${USER_ID}/ban`)
                .send({ reason: 'あ'.repeat(200) });
            expect(res.status).toBe(200);
        });

        it.each([
            ['reason が空', { reason: '' }],
            ['reason が 201 字', { reason: 'あ'.repeat(201) }],
        ])('unban は %s なら 422', async (_label, body) => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/users/${USER_ID}/unban`)
                .send(body);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.unbanUser).not.toHaveBeenCalled();
        });

        it('path の userId が UUID でなければ 422', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            for (const [method, path] of [
                ['post', '/users/not-a-uuid/ban'],
                ['post', '/users/not-a-uuid/unban'],
                ['get', '/users/not-a-uuid/traces'],
            ] as const) {
                const req = request(app.getHttpServer())[method](path);
                const res = await (method === 'post'
                    ? req.send({ reason: 'r' })
                    : req);
                expect(res.status).toBe(
                    validationPipeOptions.errorHttpStatusCode,
                );
            }
        });
    });
});
