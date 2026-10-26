import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { FeatureFlags } from '../../../core/modules/feature-flag/feature-flags.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { TripBlockV3Service } from '../usecase/trip-block.v3.service.js';
import { TripBlockV3Controller } from './trip-block.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('TripBlockV3Controller（書き込みの役割）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const featureFlags = { isEnabled: vi.fn() };
    const service = {
        findOneById: vi.fn(),
        createManyTripBlocks: vi.fn(),
        replaceOneTripBlock: vi.fn(),
        addTripToTripBlock: vi.fn(),
        deleteTripFromTripBlock: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [TripBlockV3Controller],
            providers: [
                { provide: TripBlockV3Service, useValue: service },
                { provide: FeatureFlags, useValue: featureFlags },
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
        service.createManyTripBlocks.mockResolvedValue([]);
    });

    it.each([
        ['POST', '/bulk'],
        ['PUT', `/${ID}`],
        ['PATCH', `/${ID}/add-trip`],
        ['PATCH', `/${ID}/delete-trip`],
    ])('reporter の %s %s は 403', async (method, path) => {
        auth = { userId: 'user-1', role: Role.REPORTER };
        const res = await request(app.getHttpServer())
            [method.toLowerCase() as 'post' | 'put' | 'patch'](path)
            .send({});
        expect(res.status).toBe(403);
    });

    it('匿名の POST /bulk は 403', async () => {
        auth = { userId: 'anon-1', role: null };
        const res = await request(app.getHttpServer()).post('/bulk').send([]);
        expect(res.status).toBe(403);
    });

    it('GET /:id は path の id が UUID でなければ 422', async () => {
        auth = { userId: 'anon-1', role: null };
        const res = await request(app.getHttpServer()).get('/not-a-uuid');
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        expect(service.findOneById).not.toHaveBeenCalled();
    });

    it('GET /:id は UUID の id を渡す', async () => {
        auth = { userId: 'anon-1', role: null };
        service.findOneById.mockResolvedValue({});
        const res = await request(app.getHttpServer()).get(`/${ID}`);
        expect(res.status).toBe(200);
        expect(service.findOneById).toHaveBeenCalledWith({
            id: ID,
            include: undefined,
            fields: undefined,
        });
    });

    it('editor の POST /bulk は役割で弾かれない', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR };
        const res = await request(app.getHttpServer()).post('/bulk').send([]);
        expect(res.status).not.toBe(403);
    });
});
