import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { configureExpress } from '../../../core/configs/express-settings.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { CalendarV3Service } from '../usecase/calendar.v3.service.js';
import { CalendarV3Controller } from './calendar.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

describe('CalendarV3Controller（日付の検証）', () => {
    let app: NestExpressApplication;
    const service = { findOneBySpecificDate: vi.fn() };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [CalendarV3Controller],
            providers: [{ provide: CalendarV3Service, useValue: service }],
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
        service.findOneBySpecificDate.mockResolvedValue({});
    });

    it('/as/of/:date は日付を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            '/as/of/2026-11-14?fields[calendar]=name',
        );
        expect(res.status).toBe(200);
        expect(service.findOneBySpecificDate).toHaveBeenCalledWith({
            date: '2026-11-14',
            fields: { calendar: 'name' },
        });
    });

    it.each([['/as/of/2026-02-30'], ['/as/of/garbage']])(
        '%s は 422',
        async (path) => {
            const res = await request(app.getHttpServer()).get(path);
            expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
            expect(service.findOneBySpecificDate).not.toHaveBeenCalled();
        },
    );
});
