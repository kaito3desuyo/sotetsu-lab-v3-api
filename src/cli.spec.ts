import { CommandFactory } from 'nest-commander';

vi.mock('nest-commander', () => ({
    CommandFactory: { run: vi.fn() },
}));
vi.mock('./cli.module.js', () => ({ CliModule: class CliModule {} }));

const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const PROD_AUTH = 'https://nofubcikiabamlnlxpko.supabase.co';

describe('cli', () => {
    afterEach(() => {
        process.exitCode = undefined;
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        vi.resetModules();
        vi.mocked(CommandFactory.run).mockClear();
    });

    it('本番の DB を向いていて Lambda の外なら、Nest を立てる前に 終了コード 1 にして止まる', async () => {
        vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
        vi.stubEnv('SOTETSU_PROD_MIGRATION', '');
        vi.stubEnv('DATABASE_URL', PROD_DB);
        vi.stubEnv('SUPABASE_URL', PROD_AUTH);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await import('./cli.js');
        await vi.waitFor(() => expect(process.exitCode).toBe(1));

        expect(CommandFactory.run).not.toHaveBeenCalled();
    });
});
