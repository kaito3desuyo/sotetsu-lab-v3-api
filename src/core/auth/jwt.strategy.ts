import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
    iss: string;
    sub: string;
    exp: number;
    iat: number;
    jti: string;
    client_id: string;
    scope: string;
    token_use: string;
    auth_time: number;
    version: number;
}

const cognitoIdpUrl =
    'https://cognito-idp.ap-northeast-1.amazonaws.com/' +
    process.env.COGNITO_USERPOOL_ID;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${cognitoIdpUrl}/.well-known/jwks.json`,
            }),
            issuer: cognitoIdpUrl,
            algorithms: ['RS256'],
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
        if (payload.client_id !== req.headers['x-app-client-id']) {
            throw new UnauthorizedException('Unauthorized');
        }

        if (payload.token_use !== 'access') {
            throw new UnauthorizedException('Unauthorized');
        }

        return payload;
    }
}
