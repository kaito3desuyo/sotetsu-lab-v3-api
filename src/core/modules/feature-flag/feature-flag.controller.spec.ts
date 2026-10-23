import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard.js';
import { CacheControlModule } from '../cache-control/cache-control.module.js';
import { FeatureFlagController } from './feature-flag.controller.js';
import { FeatureFlags } from './feature-flags.js';

vi.mock('../auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

describe('FeatureFlagController', () => {
    let app: INestApplication;
    let hasToken: boolean;
    const featureFlags = { all: vi.fn() };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [FeatureFlagController],
            providers: [{ provide: FeatureFlags, useValue: featureFlags }],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (ctx: any) => {
                    if (!hasToken) {
                        throw new UnauthorizedException();
                    }
                    ctx.switchToHttp().getRequest().auth = {
                        userId: 'anon-1',
                        role: null,
                    };
                    return true;
                },
            })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        featureFlags.all.mockResolvedValue({ registered_only_posting: true });
    });

    it('トークンがあれば 200 で全フラグを返し、no-store', async () => {
        hasToken = true;
        const res = await request(app.getHttpServer()).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ registered_only_posting: true });
        expect(res.headers['cache-control']).toBe('no-store');
    });

    it('トークンが無ければ 401', async () => {
        hasToken = false;
        const res = await request(app.getHttpServer()).get('/');
        expect(res.status).toBe(401);
        expect(featureFlags.all).not.toHaveBeenCalled();
    });
});
