import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isRole } from '../rbac/role.enum.js';
import { AuthContext } from './auth-context.js';
import { readUnverifiedIssuer } from './jwt-issuer.js';

const supabaseIssuer = `${process.env.SUPABASE_URL}/auth/v1`;

/** 公開鍵は Lambda の 1 実体の中で持ち回る（jose が取得とキャッシュをする） */
const supabaseJwks = createRemoteJWKSet(
    new URL(`${supabaseIssuer}/.well-known/jwks.json`),
);

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
            const error = e instanceof Error ? e : new Error(String(e));
            this.#logger.error(error.message, error.stack);
            throw new UnauthorizedException();
        }
    }

    async #verify(jwt: string): Promise<AuthContext> {
        // Cognito など Supabase 以外の発行元は、検証に回さずに断る
        if (readUnverifiedIssuer(jwt) !== supabaseIssuer) {
            throw new Error('Unexpected issuer');
        }

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
}
