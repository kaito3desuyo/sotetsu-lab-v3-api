const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// AppModule を直接組む経路（e2e など）は createApp を通らない。接続設定の根元で止める
describe('database.config（接続設定の根元の守り）', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('本番の DB を向いていて Lambda の外なら、読み込んだ時点で throw する', async () => {
        vi.stubEnv('DATABASE_URL', PROD_DB);

        await expect(import('./database.config.js')).rejects.toThrow(/本番/);
    });

    it('Lambda の上なら本番でも読み込める', async () => {
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'fn');

        await expect(import('./database.config.js')).resolves.toHaveProperty(
            'NestJSTypeOrmConfig',
        );
    });

    it('SOTETSU_PROD_MIGRATION=confirmed なら本番でも読み込める', async () => {
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SOTETSU_PROD_MIGRATION', 'confirmed');

        await expect(import('./database.config.js')).resolves.toHaveProperty(
            'DataSourceConfig',
        );
    });

    it('手元の DB なら読み込める', async () => {
        vi.stubEnv('DATABASE_URL', LOCAL_DB);

        await expect(import('./database.config.js')).resolves.toHaveProperty(
            'NestJSTypeOrmConfig',
        );
    });
});
