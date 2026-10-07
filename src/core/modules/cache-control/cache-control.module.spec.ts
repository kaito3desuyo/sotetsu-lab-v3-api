import {
    CanActivate,
    Controller,
    Get,
    INestApplication,
    NotFoundException,
    UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UseCaseError } from '../../classes/custom-error';
import { UseCaseErrorFilter } from '../../filters/usecase-error.filter';
import { CACHE_CONTROL } from './cache-control.constants';
import { CacheControl } from './cache-control.decorator';
import { CacheControlModule } from './cache-control.module';

class DenyGuard implements CanActivate {
    canActivate(): boolean {
        return false;
    }
}

@Controller()
class DummyController {
    @Get('master')
    @CacheControl(CACHE_CONTROL.MASTER)
    master(): string[] {
        return ['ok'];
    }

    @Get('not-found')
    @CacheControl(CACHE_CONTROL.MASTER)
    notFound(): string[] {
        throw new NotFoundException();
    }

    @Get('broken')
    @CacheControl(CACHE_CONTROL.MASTER)
    async broken(): Promise<string[]> {
        throw new Error('boom');
    }

    @Get('usecase-error')
    @CacheControl(CACHE_CONTROL.MASTER)
    async usecaseError(): Promise<string[]> {
        throw new UseCaseError('invalid');
    }

    @Get('unserializable')
    @CacheControl(CACHE_CONTROL.MASTER)
    unserializable(): { id: bigint } {
        // handler は値を返すが、JSON にする段階で落ちて 500 になる
        return { id: BigInt(1) };
    }

    @Get('denied')
    @UseGuards(DenyGuard)
    @CacheControl(CACHE_CONTROL.MASTER)
    denied(): string[] {
        return ['ok'];
    }

    @Get('plain')
    plain(): string[] {
        return ['ok'];
    }

    @Get('plain-broken')
    plainBroken(): string[] {
        throw new Error('boom');
    }
}

describe('CacheControlModule', () => {
    let app: INestApplication;

    // モジュールを読み込むだけで、interceptor とミドルウェアが掛かることを確かめる
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [DummyController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.useGlobalFilters(new UseCaseErrorFilter());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it.each([
        ['handler が NotFoundException を投げた 404', '/not-found', 404],
        ['handler が素の Error を投げた 500', '/broken', 500],
        [
            'UseCaseError を UseCaseErrorFilter が 422 にした返答',
            '/usecase-error',
            422,
        ],
        [
            'handler が値を返した後、JSON にする段階で落ちた 500',
            '/unserializable',
            500,
        ],
        ['guard が拒んだ 403', '/denied', 403],
        ['@CacheControl の無い handler の 500', '/plain-broken', 500],
        ['存在しない URL の 404', '/no-such-route', 404],
    ])('%s は no-store にする', async (_label, path, status) => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.status).toBe(status);
        expect(res.headers['cache-control']).toBe('no-store');
    });

    it('成功した返答は interceptor の値のまま', async () => {
        const res = await request(app.getHttpServer()).get('/master');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
    });

    it('@CacheControl の無い成功した返答には付けない', async () => {
        const res = await request(app.getHttpServer()).get('/plain');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBeUndefined();
    });
});
