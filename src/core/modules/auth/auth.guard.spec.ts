import {
    ExecutionContext,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import type { UserAccessTraceService } from '../../../libs/user/usecase/user-access-trace.service.js';
import { AuthGuard } from './auth.guard.js';

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

const contextFor = (headers: Partial<Record<string, string>>) => {
    const req: Record<string, unknown> = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, ctx };
};

const recordSession = vi.fn();
const buildGuard = () =>
    new AuthGuard({ recordSession } as unknown as UserAccessTraceService);

describe('AuthGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        recordSession.mockResolvedValue(undefined);
    });

    it.each([{}, { authorization: '' }, { authorization: 'Bearer ' }])(
        'トークンが無ければ 401（%o）',
        async (headers) => {
            const { ctx } = contextFor(headers);
            await expect(buildGuard().canActivate(ctx)).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
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
        await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({
            userId: 'anon-1',
            role: null,
            sessionId: null,
        });
    });

    it('Supabase の JWT なら sub と user_role を auth に入れる', async () => {
        supabaseVerify.mockResolvedValueOnce({
            payload: { sub: 'u-1', user_role: 'editor' },
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({
            userId: 'u-1',
            role: 'editor',
            sessionId: null,
        });
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
        await buildGuard().canActivate(ctx);
        expect(req.auth).toEqual({
            userId: 'u-2',
            role: null,
            sessionId: null,
        });
    });

    it('Supabase 以外の iss（Cognito など）は検証に回さず 401', async () => {
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await expect(buildGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
        expect(supabaseVerify).not.toHaveBeenCalled();
    });

    it('検証に失敗したら 401', async () => {
        supabaseVerify.mockRejectedValueOnce(new Error('expired'));
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(buildGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('JWT の形をしていなければ検証に回さず 401', async () => {
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': 'Bearer not-a-jwt',
        });
        await expect(buildGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
        expect(supabaseVerify).not.toHaveBeenCalled();
    });

    describe('手がかりの記録', () => {
        const registered = {
            payload: { sub: 'u-1', user_role: 'reporter', session_id: 's-1' },
        };
        const headers = {
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
            'cloudfront-viewer-address': '203.0.113.7:51234',
            'user-agent': 'Mozilla/5.0 test',
        };

        it('登録者のトークンと CloudFront-Viewer-Address があれば recordSession を session_id・IP・UA で呼ぶ', async () => {
            supabaseVerify.mockResolvedValueOnce(registered);
            const { req, ctx } = contextFor(headers);
            await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
            expect(recordSession).toHaveBeenCalledWith({
                userId: 'u-1',
                sessionId: 's-1',
                ip: '203.0.113.7',
                userAgent: 'Mozilla/5.0 test',
            });
            expect(req.auth).toEqual({
                userId: 'u-1',
                role: 'reporter',
                sessionId: 's-1',
            });
        });

        it('匿名（user_role なし）は呼ばない', async () => {
            supabaseVerify.mockResolvedValueOnce({
                payload: { sub: 'anon-1', session_id: 's-anon' },
            });
            const { ctx } = contextFor(headers);
            await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
            expect(recordSession).not.toHaveBeenCalled();
        });

        it('session_id が文字列でなければ呼ばない', async () => {
            supabaseVerify.mockResolvedValueOnce({
                payload: { sub: 'u-1', user_role: 'reporter', session_id: 1 },
            });
            const { req, ctx } = contextFor(headers);
            await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
            expect(recordSession).not.toHaveBeenCalled();
            expect(req.auth).toEqual({
                userId: 'u-1',
                role: 'reporter',
                sessionId: null,
            });
        });

        it('ヘッダーが無ければ呼ばない', async () => {
            supabaseVerify.mockResolvedValueOnce(registered);
            const { ctx } = contextFor({
                'x-sotetsu-lab-authorization':
                    headers['x-sotetsu-lab-authorization'],
            });
            await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
            expect(recordSession).not.toHaveBeenCalled();
        });

        it('recordSession が失敗しても true を返し、warn に残す', async () => {
            const warn = vi
                .spyOn(Logger.prototype, 'warn')
                .mockImplementation(() => undefined);
            supabaseVerify.mockResolvedValueOnce(registered);
            recordSession.mockRejectedValueOnce(new Error('db down'));
            const { ctx } = contextFor(headers);
            await expect(buildGuard().canActivate(ctx)).resolves.toBe(true);
            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('手がかりの記録に失敗しました'),
            );
            warn.mockRestore();
        });
    });
});
