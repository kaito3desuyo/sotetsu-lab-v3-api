describe('CliModule', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('AuthGuard が使う Global の UserLibsModule を import している', async () => {
        // AuthGuard を読む module の import 時に Supabase の URL が要る
        vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
        const { CliModule } = await import('./cli.module.js');
        const { UserLibsModule } =
            await import('./libs/user/user.libs.module.js');

        const imports: unknown[] = Reflect.getMetadata('imports', CliModule);
        expect(imports).toContain(UserLibsModule);
    });
});
