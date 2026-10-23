import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
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
        service.post.mockResolvedValue({ operationSightingId: SIGHTING_ID });
        service.invalidate.mockResolvedValue({});
        service.restore.mockResolvedValue({});
    });

    it('匿名（役割なし）の投稿は 403', async () => {
        auth = { userId: 'anon-1', role: null };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(403);
        expect(service.post).not.toHaveBeenCalled();
    });

    it('reporter の投稿は通り、JWT の sub を投稿者として渡す', async () => {
        auth = { userId: 'user-1', role: Role.REPORTER };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(201);
        expect(service.post).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-1' }),
        );
    });

    it('無効化は body の userId を捨て、JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR };
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

    it('復元も JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.MANAGER };
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
