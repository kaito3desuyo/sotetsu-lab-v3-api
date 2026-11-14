import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { configureExpress } from '../../../core/configs/express-settings.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { CalendarDateV3Service } from '../usecase/calendar-date.v3.service.js';
import { CalendarDateV3Controller } from './calendar-date.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const CALENDAR_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('CalendarDateV3Controller（一覧の検証）', () => {
    let app: NestExpressApplication;
    const service = { findMany: vi.fn() };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [CalendarDateV3Controller],
            providers: [{ provide: CalendarDateV3Service, useValue: service }],
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
        service.findMany.mockResolvedValue([]);
    });

    it('calendarId・from・to を渡す', async () => {
        const res = await request(app.getHttpServer()).get(
            `/?calendarId=${CALENDAR_ID}&from=2026-01-01&to=2026-12-31&fields[calendarDate]=date`,
        );
        expect(res.status).toBe(200);
        expect(service.findMany).toHaveBeenCalledWith({
            calendarId: CALENDAR_ID,
            from: '2026-01-01',
            to: '2026-12-31',
            fields: { calendarDate: 'date' },
        });
    });

    it('何も付けなくても通る', async () => {
        const res = await request(app.getHttpServer()).get('/');
        expect(res.status).toBe(200);
        expect(service.findMany).toHaveBeenCalledWith({});
    });

    it.each([
        ['/?from=garbage'],
        ['/?to=2026-02-30'],
        ['/?from=2026-11-14T00:00:00%2B09:00'],
        ['/?calendarId=not-a-uuid'],
    ])('%s は 422', async (path) => {
        const res = await request(app.getHttpServer()).get(path);
        expect(res.status).toBe(validationPipeOptions.errorHttpStatusCode);
        expect(service.findMany).not.toHaveBeenCalled();
    });
});
