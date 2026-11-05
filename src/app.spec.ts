import { NestFactory } from '@nestjs/core';

vi.mock('@nestjs/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@nestjs/core')>();
    return { ...actual, NestFactory: { create: vi.fn() } };
});
vi.mock('./app.module.js', () => ({ AppModule: class AppModule {} }));

const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const PROD_AUTH = 'https://nofubcikiabamlnlxpko.supabase.co';

describe('createApp', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.mocked(NestFactory.create).mockClear();
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
});
