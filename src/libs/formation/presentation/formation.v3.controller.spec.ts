import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { configureExpress } from '../../../core/configs/express-settings.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { FormationV3Service } from '../usecase/formation.v3.service.js';
import { FormationV3Controller } from './formation.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

describe('FormationV3Controller（日付・期間の検証）', () => {
    let app: NestExpressApplication;
    const service = {
        findManyBySpecificDate: vi.fn(),
        findManyBySpecificPeriod: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [FormationV3Controller],
            providers: [{ provide: FormationV3Service, useValue: service }],
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
        service.findManyBySpecificDate.mockResolvedValue([]);
        service.findManyBySpecificPeriod.mockResolvedValue([]);
    });

    const UNPROCESSABLE = validationPipeOptions.errorHttpStatusCode;

    it('/as/of/:date は日付を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            '/as/of/2026-11-14?fields[formation]=formationNumber',
        );
        expect(res.status).toBe(200);
        expect(service.findManyBySpecificDate).toHaveBeenCalledWith({
            date: '2026-11-14',
            fields: { formation: 'formationNumber' },
        });
    });

    it.each([['/as/of/2026-02-30'], ['/as/of/garbage'], ['/as/of/20261114']])(
        '%s は 422',
        async (path) => {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(UNPROCESSABLE);
            expect(service.findManyBySpecificDate).not.toHaveBeenCalled();
        },
    );

    it('/from/:startDate/to/:endDate は 31 日まで通し、startDate・endDate を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            '/from/2026-11-01/to/2026-12-01',
        );
        expect(res.status).toBe(200);
        expect(service.findManyBySpecificPeriod).toHaveBeenCalledWith({
            startDate: '2026-11-01',
            endDate: '2026-12-01',
        });
    });

    it.each([
        ['/from/2026-11-01/to/2026-12-02'],
        ['/from/garbage/to/2026-11-14'],
        ['/from/2026-02-30/to/2026-03-01'],
        ['/from/2026-11-14/to/2026-11-13'],
    ])('%s は 422', async (path) => {
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(UNPROCESSABLE);
        expect(service.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });
});
