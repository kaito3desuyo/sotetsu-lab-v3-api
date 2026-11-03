import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { FeatureFlags } from '../../../core/modules/feature-flag/feature-flags.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { OperationSightingV3Service } from '../../operation-sighting/usecase/operation-sighting.v3.service.js';
import { UserRoleService } from '../usecase/user-role.service.js';
import { UserV3Service } from '../usecase/user.v3.service.js';
import { UserV3Controller } from './user.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const USER_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

/** 読み取りの口（EDITOR・MANAGER）。/v3/users に載る */
const ROUTES = [`/${USER_ID}`, `/${USER_ID}/operation-sightings`];

describe('UserV3Controller（利用者の読み取りの口・BAN・手がかり）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        findUserSummary: vi.fn(),
        banUser: vi.fn(),
        unbanUser: vi.fn(),
        findTraces: vi.fn(),
    };
    const operationSightingService = {
        findManyByUserId: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [UserV3Controller],
            providers: [
                { provide: UserV3Service, useValue: service },
                {
                    provide: OperationSightingV3Service,
                    useValue: operationSightingService,
                },
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
        service.findUserSummary.mockResolvedValue({ userId: USER_ID });
        operationSightingService.findManyByUserId.mockResolvedValue([]);
    });

    it.each(ROUTES)('%s は REPORTER で 403', async (path) => {
        auth = { userId: 'u-1', role: Role.REPORTER, sessionId: null };
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(403);
        expect(service.findUserSummary).not.toHaveBeenCalled();
        expect(
            operationSightingService.findManyByUserId,
        ).not.toHaveBeenCalled();
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

    it.each(ROUTES)(
        '%s の応答は保存させない（個人情報を含む）',
        async (path) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(path);
            expect(res.headers['cache-control']).toBe('no-store');
        },
    );

    it('目撃の limit の既定は 100、before は無し', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get(
            `/${USER_ID}/operation-sightings`,
        );
        expect(operationSightingService.findManyByUserId).toHaveBeenCalledWith({
            userId: USER_ID,
            limit: 100,
            before: undefined,
        });
    });

    it('目撃の limit と before を受け取る', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        await request(app.getHttpServer()).get(
            `/${USER_ID}/operation-sightings?limit=5&before=2026-11-01T00:00:00.000Z`,
        );
        expect(operationSightingService.findManyByUserId).toHaveBeenCalledWith({
            userId: USER_ID,
            limit: 5,
            before: '2026-11-01T00:00:00.000Z',
        });
    });

    it.each(['0', '201', '1.5', 'abc'])(
        '目撃の limit=%s は 422',
        async (limit) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(
                `/${USER_ID}/operation-sightings?limit=${limit}`,
            );
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(
                operationSightingService.findManyByUserId,
            ).not.toHaveBeenCalled();
        },
    );

    it.each(['1', '200'])('目撃の limit=%s は通る', async (limit) => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            `/${USER_ID}/operation-sightings?limit=${limit}`,
        );
        expect(res.status).toBe(200);
    });

    it('目撃の before が ISO 8601 でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        const res = await request(app.getHttpServer()).get(
            `/${USER_ID}/operation-sightings?before=yesterday`,
        );
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
    });

    it.each(['2026-W01', '2026-123', '2026-02-30', '2026-02-30T00:00:00.000Z'])(
        '目撃の before=%s は Date にできない・暦上ありえないので 422',
        async (before) => {
            auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
            const res = await request(app.getHttpServer()).get(
                `/${USER_ID}/operation-sightings?before=${before}`,
            );
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(
                operationSightingService.findManyByUserId,
            ).not.toHaveBeenCalled();
        },
    );

    it('path の userId が UUID でなければ 422', async () => {
        auth = { userId: 'e-1', role: Role.EDITOR, sessionId: null };
        for (const path of ['/not-a-uuid', '/not-a-uuid/operation-sightings']) {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        }
    });

    describe('BAN・解除・手がかり（MANAGER だけ）', () => {
        const SUMMARY = { userId: USER_ID, banned: true };
        const CALLS = [
            {
                label: 'POST /users/:userId/ban',
                method: 'post' as const,
                path: `/${USER_ID}/ban`,
                body: { reason: '荒らし' },
            },
            {
                label: 'POST /users/:userId/unban',
                method: 'post' as const,
                path: `/${USER_ID}/unban`,
                body: { reason: '誤爆' },
            },
            {
                label: 'GET /users/:userId/traces',
                method: 'get' as const,
                path: `/${USER_ID}/traces`,
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
                .post(`/${USER_ID}/ban`)
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
                .post(`/${USER_ID}/unban`)
                .send({});
            expect(service.unbanUser).toHaveBeenCalledWith({
                userId: USER_ID,
                changedBy: 'm-1',
                reason: undefined,
            });
        });

        it('traces は userId を渡す', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            await request(app.getHttpServer()).get(`/${USER_ID}/traces`);
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
                .post(`/${USER_ID}/ban`)
                .send(body);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.banUser).not.toHaveBeenCalled();
        });

        it('ban の reason は 200 字ちょうどなら通る', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/${USER_ID}/ban`)
                .send({ reason: 'あ'.repeat(200) });
            expect(res.status).toBe(200);
        });

        it.each([
            ['reason が空', { reason: '' }],
            ['reason が 201 字', { reason: 'あ'.repeat(201) }],
        ])('unban は %s なら 422', async (_label, body) => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            const res = await request(app.getHttpServer())
                .post(`/${USER_ID}/unban`)
                .send(body);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.unbanUser).not.toHaveBeenCalled();
        });

        it('path の userId が UUID でなければ 422', async () => {
            auth = { userId: 'm-1', role: Role.MANAGER, sessionId: null };
            for (const [method, path] of [
                ['post', '/not-a-uuid/ban'],
                ['post', '/not-a-uuid/unban'],
                ['get', '/not-a-uuid/traces'],
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
