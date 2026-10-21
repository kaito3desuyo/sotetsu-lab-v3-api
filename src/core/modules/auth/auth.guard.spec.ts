import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

// auth.guard は読み込んだ時点で SUPABASE_URL を使うので、import より前に（vi.hoisted で）入れる
const { supabaseVerify } = vi.hoisted(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    return { supabaseVerify: vi.fn() };
});

// 実物の JWKS を取りに行かないよう、jose を差し替える
vi.mock('jose', () => ({
    createRemoteJWKSet: () => 'jwks',
    jwtVerify: (...args: unknown[]) => supabaseVerify(...args),
}));

const SUPABASE_ISS = 'https://example.supabase.co/auth/v1';

const jwtWithIss = (iss: string) =>
    `x.${Buffer.from(JSON.stringify({ iss })).toString('base64url')}.y`;

const contextFor = (headers: Record<string, string>) => {
    const req: Record<string, unknown> = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, ctx };
};

describe('AuthGuard', () => {
    beforeEach(() => vi.clearAllMocks());

    it.each([{}, { authorization: '' }, { authorization: 'Bearer ' }])(
        'トークンが無ければ 401（%o）',
        async (headers) => {
            const { ctx } = contextFor(headers);
            await expect(
                new AuthGuard().canActivate(ctx),
            ).rejects.toBeInstanceOf(UnauthorizedException);
            expect(supabaseVerify).not.toHaveBeenCalled();
        },
    );

    it('匿名セッション（user_role 無し）でも検証が通れば通す', async () => {
        supabaseVerify.mockResolvedValueOnce({
            payload: { sub: 'anon-1', is_anonymous: true },
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({ userId: 'anon-1', role: null });
    });

    it('Supabase の JWT なら sub と user_role を auth に入れる', async () => {
        supabaseVerify.mockResolvedValueOnce({
            payload: { sub: 'u-1', user_role: 'editor' },
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({ userId: 'u-1', role: 'editor' });
        expect(supabaseVerify).toHaveBeenCalledWith(
            expect.any(String),
            'jwks',
            {
                issuer: SUPABASE_ISS,
                audience: 'authenticated',
                algorithms: ['ES256'],
            },
        );
    });

    it('Supabase の JWT で user_role が無ければ role は null', async () => {
        supabaseVerify.mockResolvedValueOnce({ payload: { sub: 'u-2' } });
        const { req, ctx } = contextFor({
            authorization: `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: 'u-2', role: null });
    });

    it('Supabase 以外の iss（Cognito など）は検証に回さず 401', async () => {
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
        expect(supabaseVerify).not.toHaveBeenCalled();
    });

    it('検証に失敗したら 401', async () => {
        supabaseVerify.mockRejectedValueOnce(new Error('expired'));
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('JWT の形をしていなければ検証に回さず 401', async () => {
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': 'Bearer not-a-jwt',
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
        expect(supabaseVerify).not.toHaveBeenCalled();
    });
});
