import { Controller, Get, Query } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureExpress } from './express-settings.js';

@Controller()
class EchoController {
    @Get('echo')
    echo(@Query() query: unknown): unknown {
        return query;
    }
}

describe('configureExpress', () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [EchoController],
        }).compile();
        app = moduleRef.createNestApplication<NestExpressApplication>();
        configureExpress(app);
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // Express 5 の既定（simple）では fields[trip] が入れ子にならず、項目選択（ADR-0002）が効かなくなる
    it('fields[資源]=項目 を入れ子のオブジェクトとして受け取る', async () => {
        const res = await request(app.getHttpServer())
            .get(
                '/echo?calendarId=c1&fields%5Btrip%5D=tripNumber&fields%5Btime%5D=stationId,stopSequence',
            )
            .expect(200);

        expect(res.body).toEqual({
            calendarId: 'c1',
            fields: { trip: 'tripNumber', time: 'stationId,stopSequence' },
        });
    });
});
