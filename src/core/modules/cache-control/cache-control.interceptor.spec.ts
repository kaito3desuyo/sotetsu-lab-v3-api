import {
    Controller,
    Get,
    INestApplication,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UseCaseError } from '../../classes/custom-error';
import { UseCaseErrorFilter } from '../../filters/usecase-error.filter';
import { CACHE_CONTROL } from './cache-control.constants';
import { CacheControl } from './cache-control.decorator';
import { CacheControlInterceptor } from './cache-control.interceptor';

@Controller()
class DummyController {
    @Get('master')
    @CacheControl(CACHE_CONTROL.MASTER)
    master(): string[] {
        return ['ok'];
    }

    @Get('async')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async asyncOk(): Promise<string[]> {
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

    @Get('plain')
    plain(): string[] {
        return ['ok'];
    }
}

describe('CacheControlInterceptor', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [DummyController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.useGlobalFilters(new UseCaseErrorFilter());
        app.useGlobalInterceptors(new CacheControlInterceptor(new Reflector()));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('同期で返す handler の成功した返答に、指定の Cache-Control を付ける', async () => {
        const res = await request(app.getHttpServer()).get('/master');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
    });

    it('Promise を返す handler の成功した返答にも付ける', async () => {
        const res = await request(app.getHttpServer()).get('/async');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
    });

    it('@CacheControl の無い handler には付けない', async () => {
        const res = await request(app.getHttpServer()).get('/plain');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBeUndefined();
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
    ])('%s には付けない', async (_label, path, status) => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.status).toBe(status);
        expect(res.headers['cache-control']).toBeUndefined();
    });

    it('値は 3 種類だけ', () => {
        expect(CACHE_CONTROL).toEqual({
            MASTER: 'private, max-age=3600',
            TIMETABLE: 'private, max-age=3600',
            REALTIME: 'no-store',
        });
    });
});
