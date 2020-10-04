import { Injectable, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { find } from 'lodash';
import jwkKeys from './jwks.json';

@Injectable()
export class AuthService {
    checkToken(authHeader: string, clientIdHeader: string) {
        // 本番環境でなければ常にtrueを返す
        // if (process.env.NODE_ENV === 'development') {
        // return true;
        // }

        if (!authHeader) {
            Logger.error('Authorization header is empty.');
        }

        if (!clientIdHeader) {
            Logger.error('X-APP-CLIENT-ID header is empty.');
        }

        // 秘密鍵
        const token = authHeader.split(' ');
        const decoded = jwt.decode(token[1], { complete: true }) as any;

        if (!decoded) {
            Logger.error('Authorization header is invalid.');
            return false;
        }

        // 公開鍵
        const jwk = find(jwkKeys.keys, (obj) => obj.kid === decoded.header.kid);
        const pem = jwkToPem(jwk);

        const verify = jwt.verify(token[1], pem, {
            algorithms: ['RS256'],
        }) as unknown;

        // subがX-APP-CLIENT_IDと一致していること
        if (verify['sub'] !== clientIdHeader) {
            // tslint:disable-next-line: no-console
            Logger.error('The X-APP-CLIENT-ID is different.');
            return false;
        }

        // issがAWS CognitoのユーザープールIDと一致していること
        if (
            verify['iss'] !==
            'https://cognito-idp.ap-northeast-1.amazonaws.com/' +
                process.env.COGNITO_USERPOOL_ID
        ) {
            Logger.error('The User Pool ID is different.');
            return false;
        }

        // token_useがaccessになっていること
        if (verify['token_use'] !== 'access') {
            // tslint:disable-next-line: no-console
            Logger.error('This token is not an access token.');
            return false;
        }

        // スコープが指定値であること
        if (verify['scope'] !== 'sotetsu-lab-v3-api/fullaccess') {
            Logger.error('Not allowed scope.');
            return false;
        }

        return true;
    }
}
