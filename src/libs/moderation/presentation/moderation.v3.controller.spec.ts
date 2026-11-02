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

describe('ModerationV3Controller（見回りの読み取りの口）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        findUserSummary: vi.fn(),
        findSightingsByUser: vi.fn(),
        findSightingAuthor: vi.fn(),
        findRecentSightings: vi.fn(),
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
});
