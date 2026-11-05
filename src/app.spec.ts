import { NestFactory } from '@nestjs/core';

vi.mock('@nestjs/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@nestjs/core')>();
    return { ...actual, NestFactory: { create: vi.fn() } };
});
vi.mock('./app.module.js', () => ({ AppModule: class AppModule {} }));

const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const PROD_AUTH = 'https://nofubcikiabamlnlxpko.supabase.co';
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const LOCAL_AUTH = 'http://127.0.0.1:54321';

describe('createApp', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.mocked(NestFactory.create).mockReset();
    });

    it('本番の DB を向いていて Lambda の外なら、Nest を立てる前に throw する', async () => {
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SUPABASE_URL', PROD_AUTH);
        const { createApp } = await import('./app.js');

        await expect(createApp()).rejects.toThrow(/本番/);
        expect(NestFactory.create).not.toHaveBeenCalled();
    });

    it('手元の DB なら Nest を立てに進む', async () => {
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
        vi.stubEnv('DATABASE_URL', LOCAL_DB);
        vi.stubEnv('SUPABASE_URL', LOCAL_AUTH);
        vi.mocked(NestFactory.create).mockRejectedValue(new Error('stop'));
        const { createApp } = await import('./app.js');

        await expect(createApp()).rejects.toThrow('stop');
        expect(NestFactory.create).toHaveBeenCalledTimes(1);
    });

    it('Lambda の上なら本番の DB でも Nest を立てに進む', async () => {
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'fn');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SUPABASE_URL', PROD_AUTH);
        vi.mocked(NestFactory.create).mockRejectedValue(new Error('stop'));
        const { createApp } = await import('./app.js');

        await expect(createApp()).rejects.toThrow('stop');
        expect(NestFactory.create).toHaveBeenCalledTimes(1);
    });
});
