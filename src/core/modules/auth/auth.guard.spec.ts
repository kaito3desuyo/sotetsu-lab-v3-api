import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

// jose は ESM 専用で jest が読めないので、実物を読ませずに差し替える
const supabaseVerify = jest.fn();
jest.mock('jose', () => ({
    createRemoteJWKSet: () => 'jwks',
    jwtVerify: (...args: unknown[]) => supabaseVerify(...args),
}));
const cognitoVerify = jest.fn();
jest.mock('aws-jwt-verify', () => ({
    CognitoJwtVerifier: {
        create: () => ({ verify: cognitoVerify, cacheJwks: jest.fn() }),
    },
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ISS = 'https://example.supabase.co/auth/v1';

// import だと巻き上げられて SUPABASE_URL を入れる前に読まれるので require にする
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AuthGuard } = require('./auth.guard');

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
    beforeEach(() => jest.clearAllMocks());

    it.each([{}, { authorization: '' }, { authorization: 'Bearer ' }])(
        'トークンが無ければ 401（%o）',
        async (headers) => {
            const { ctx } = contextFor(headers);
            await expect(
                new AuthGuard().canActivate(ctx),
            ).rejects.toBeInstanceOf(UnauthorizedException);
            expect(supabaseVerify).not.toHaveBeenCalled();
            expect(cognitoVerify).not.toHaveBeenCalled();
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

    it('Cognito のトークンは scope の末尾を role にし、userId は null', async () => {
        cognitoVerify.mockResolvedValueOnce({
            sub: 'client-id',
            scope: 'sotetsu-lab-v3-api/reporter',
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: null, role: 'reporter' });
    });

    it('Cognito の fullaccess は role を持たない', async () => {
        cognitoVerify.mockResolvedValueOnce({
            sub: 'client-id',
            scope: 'sotetsu-lab-v3-api/fullaccess',
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: null, role: null });
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

    it('JWT の形をしていなければ 401', async () => {
        cognitoVerify.mockRejectedValueOnce(new Error('malformed'));
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': 'Bearer not-a-jwt',
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });
});
