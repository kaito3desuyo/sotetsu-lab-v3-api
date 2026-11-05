const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

describe('data-source（TypeORM の CLI の入口）', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('本番の DB を向いていて Lambda の外なら、読み込んだ時点で throw する', async () => {
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SUPABASE_URL', 'https://nofubcikiabamlnlxpko.supabase.co');

        await expect(import('./data-source.js')).rejects.toThrow(/本番/);
    });

    it('SOTETSU_PROD_MIGRATION=confirmed なら本番でも読み込める（migration:run:prod の中）', async () => {
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SUPABASE_URL', 'https://nofubcikiabamlnlxpko.supabase.co');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', 'confirmed');

        await expect(import('./data-source.js')).resolves.toHaveProperty(
            'AppDataSource',
        );
    });

    it('手元の DB なら読み込める', async () => {
        vi.stubEnv('DATABASE_URL', LOCAL_DB);
        vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');

        await expect(import('./data-source.js')).resolves.toHaveProperty(
            'AppDataSource',
        );
    });
});
