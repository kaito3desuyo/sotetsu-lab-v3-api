import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
