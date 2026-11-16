import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { corsOptions, timingAllowOrigin } from './cors-options.js';

@Controller()
class DummyController {
    @Get('ping')
    ping(): string {
        return 'pong';
    }
}

describe('corsOptions', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [DummyController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.enableCors(corsOptions('https://v3.sotetsu-lab.com'));
        app.use(timingAllowOrigin('https://v3.sotetsu-lab.com'));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('preflight の結果をブラウザに 2 時間覚えさせる（Access-Control-Max-Age: 7200）', async () => {
        const res = await request(app.getHttpServer())
            .options('/ping')
            .set('Origin', 'https://v3.sotetsu-lab.com')
            .set('Access-Control-Request-Method', 'GET')
            .set(
                'Access-Control-Request-Headers',
                'x-sotetsu-lab-authorization',
            );

        expect(res.status).toBe(204);
        expect(res.headers['access-control-max-age']).toBe('7200');
        expect(res.headers['access-control-allow-origin']).toBe(
            'https://v3.sotetsu-lab.com',
        );
    });

    it('応答に Timing-Allow-Origin を CORS と同じ origin で付ける', async () => {
        const res = await request(app.getHttpServer())
            .get('/ping')
            .set('Origin', 'https://v3.sotetsu-lab.com');

        expect(res.headers['timing-allow-origin']).toBe(
            'https://v3.sotetsu-lab.com',
        );
    });

    it('timingAllowOrigin に origin を渡さなければ * を許す', () => {
        const setHeader = vi.fn();
        const next = vi.fn();
        timingAllowOrigin(undefined)({}, { setHeader }, next);
        expect(setHeader).toHaveBeenCalledWith('Timing-Allow-Origin', '*');
        expect(next).toHaveBeenCalled();
    });

    it('origin を渡さなければ、これまでどおり * を許す', () => {
        expect(corsOptions(undefined).origin).toBe('*');
    });
});
