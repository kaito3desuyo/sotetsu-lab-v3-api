import { ExecutionContext } from '@nestjs/common';
import type { UserAccessTraceService } from '../../../libs/user/usecase/user-access-trace.service.js';
import { AuthGuard } from './auth.guard.js';

// auth.guard は読み込んだ時点で環境変数を使うので、import より前に（vi.hoisted で）入れる。
// 手元の Supabase は iss を http://127.0.0.1:54321/auth/v1 で発行するが、コンテナの api は
// host.docker.internal で JWKS を取りに行くので、JWKS の URL と期待する iss を別に持たせる
const { supabaseVerify, jwksUrls } = vi.hoisted(() => {
    process.env.SUPABASE_URL = 'http://host.docker.internal:54321';
    process.env.SUPABASE_JWT_ISSUER = 'http://127.0.0.1:54321/auth/v1';
    return { supabaseVerify: vi.fn(), jwksUrls: [] as string[] };
});

vi.mock('jose', () => ({
    createRemoteJWKSet: (url: URL) => {
        jwksUrls.push(url.href);
        return 'jwks';
    },
    jwtVerify: (...args: unknown[]) => supabaseVerify(...args),
}));

const LOCAL_ISS = 'http://127.0.0.1:54321/auth/v1';

const jwtWithIss = (iss: string) =>
    `x.${Buffer.from(JSON.stringify({ iss })).toString('base64url')}.y`;

const contextFor = (token: string) => {
    const req: Record<string, unknown> = {
        headers: { authorization: `Bearer ${token}` },
    };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, ctx };
};

const buildGuard = () =>
    new AuthGuard({
        recordSession: vi.fn(),
    } as unknown as UserAccessTraceService);

describe('AuthGuard（SUPABASE_JWT_ISSUER を与えたとき）', () => {
    beforeEach(() => {
        supabaseVerify.mockReset();
    });

    it('JWKS は SUPABASE_URL から取りに行く', () => {
        expect(jwksUrls).toEqual([
            'http://host.docker.internal:54321/auth/v1/.well-known/jwks.json',
        ]);
    });

    it('SUPABASE_JWT_ISSUER の iss を期待し、検証にも渡す', async () => {
        supabaseVerify.mockResolvedValueOnce({ payload: { sub: 'u-1' } });
        const { req, ctx } = contextFor(jwtWithIss(LOCAL_ISS));
        await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({
            userId: 'u-1',
            role: null,
            sessionId: null,
        });
        expect(supabaseVerify).toHaveBeenCalledWith(
            expect.any(String),
            'jwks',
            {
                issuer: LOCAL_ISS,
                audience: 'authenticated',
                algorithms: ['ES256'],
            },
        );
    });

    it('SUPABASE_URL から組み立てた iss は期待しない', async () => {
        const { ctx } = contextFor(
            jwtWithIss('http://host.docker.internal:54321/auth/v1'),
        );
        await expect(buildGuard().canActivate(ctx)).rejects.toThrow();
        expect(supabaseVerify).not.toHaveBeenCalled();
    });
});
