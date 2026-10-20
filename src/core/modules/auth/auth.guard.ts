import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Request } from 'express';
import { readFileSync } from 'fs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isRole } from '../rbac/role.enum';
import { AuthContext } from './auth-context';
import { readUnverifiedIssuer } from './jwt-issuer';

const supabaseIssuer = `${process.env.SUPABASE_URL}/auth/v1`;

/** 公開鍵は Lambda の 1 実体の中で持ち回る（jose が取得とキャッシュをする） */
const supabaseJwks = createRemoteJWKSet(
    new URL(`${supabaseIssuer}/.well-known/jwks.json`),
);

/** 切り替えの途中だけ受け付ける（spec 9 章の 2〜6）。6 で aws-jwt-verify ごと消す */
const cognitoVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USERPOOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    tokenUse: 'access',
});
cognitoVerifier.cacheJwks(
    JSON.parse(readFileSync(__dirname + '/jwks.json', { encoding: 'utf-8' })),
);

const COGNITO_SCOPE_PREFIX = 'sotetsu-lab-v3-api/';

/**
 * 読み取りも含めてトークンを求める（ゲストは backend が作る Supabase の匿名セッションのトークン）。
 * 無いか検証に失敗したら 401。通れば req.auth に利用者と役割を入れる。役割を求めるのは RBACGuard。
 */
@Injectable()
export class AuthGuard implements CanActivate {
    readonly #logger = new Logger(AuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader =
            req.headers['x-sotetsu-lab-authorization'] ??
            req.headers.authorization ??
            '';
        const jwt = (
            Array.isArray(authHeader) ? authHeader[0] : authHeader
        ).replace('Bearer ', '');

        if (!jwt) {
            throw new UnauthorizedException();
        }

        try {
            req.auth = await this.#verify(jwt);
            return true;
        } catch (e) {
            this.#logger.error(e.message, e.stack);
            throw new UnauthorizedException();
        }
    }

    async #verify(jwt: string): Promise<AuthContext> {
        if (readUnverifiedIssuer(jwt) === supabaseIssuer) {
            const { payload } = await jwtVerify(jwt, supabaseJwks, {
                issuer: supabaseIssuer,
                audience: 'authenticated',
                algorithms: ['ES256'],
            });
            return {
                userId: payload.sub ?? null,
                role: isRole(payload.user_role) ? payload.user_role : null,
            };
        }

        const payload = await cognitoVerifier.verify(jwt);
        const scope = String(payload.scope ?? '').replace(
            COGNITO_SCOPE_PREFIX,
            '',
        );
        return { userId: null, role: isRole(scope) ? scope : null };
    }
}
